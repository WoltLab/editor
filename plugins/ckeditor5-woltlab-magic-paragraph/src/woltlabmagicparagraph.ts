/**
 * Listens for clicks in the editor that occur within the margin of certain
 * block elements as well as clicks at the very beginning or end of the editor.
 * If such a click is detected and there is no paragraph at that location then
 * a paragraph will implicitly be injected and the caret is being moved into it.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import {
  ClickObserver,
  Element,
  type ViewDocumentClickEvent,
} from "@ckeditor/ckeditor5-engine";
import ContainerElement from "@ckeditor/ckeditor5-engine/src/view/containerelement";

export class WoltlabMagicParagraph extends Plugin {
  static readonly blockModels = ["blockQuote", "codeBlock", "spoiler", "table"];

  static get pluginName() {
    return "WoltlabMagicParagraph";
  }

  init() {
    const { mapper, view } = this.editor.editing;
    const { document, domConverter } = view;

    view.addObserver(ClickObserver);

    this.listenTo<ViewDocumentClickEvent>(document, "click", (event, data) => {
      console.clear();

      const { domEvent, target } = data;

      // Ignore any click that hits a paragraph or list item, because those
      // are perfectly accessible anyway.
      const elements = target.getAncestors();
      elements.push(target);
      for (const element of elements) {
        if (element.is("element", "p") || element.is("element", "li")) {
          return;
        }
      }

      const { clientY } = domEvent;

      // Check if the click occurred before the first element or after the
      // last element. These elements do not have a margin thus they would
      // fail to detect in the margin hit check below.
      const root = document.getRoot()!;
      const firstChild = root.getChild(0);
      if (firstChild === undefined) {
        return;
      }

      if (firstChild.is("containerElement")) {
        const model = mapper.toModelElement(firstChild);
        if (model && WoltlabMagicParagraph.blockModels.includes(model.name)) {
          const domElement = domConverter.mapViewToDom(firstChild)!;
          const { top } = domElement.getBoundingClientRect();

          if (clientY <= top) {
            event.stop();

            this.#insertParagraphBefore(firstChild);
            return;
          }
        }
      }

      if (root.childCount > 1) {
        const lastChild = root.getChild(root.childCount - 1)!;

        if (lastChild.is("containerElement")) {
          const model = mapper.toModelElement(lastChild);
          if (model && WoltlabMagicParagraph.blockModels.includes(model.name)) {
            const domElement = domConverter.mapViewToDom(lastChild)!;
            const { bottom } = domElement.getBoundingClientRect();

            if (clientY >= bottom) {
              event.stop();

              this.#insertParagraphAfter(lastChild);
              return;
            }
          }
        }
      }

      // Find any block element whose margin is possibly being clicked on.
      for (const candidate of this.#findPossibleBlocks()) {
        const domElement = domConverter.mapViewToDom(candidate)!;
        const { bottom, top } = domElement.getBoundingClientRect();
        const { marginBottom, marginTop } = window.getComputedStyle(domElement);

        const topBoundary = top - parseInt(marginTop);
        const bottomBoundary = bottom + parseInt(marginBottom);

        if (clientY < topBoundary) {
          // The click occurred somewhere above this element but outsides its
          // margin. Elements are being transversed from top to bottom which
          // means that we can safely stop searching at this point.
          return;
        }

        if (clientY >= topBoundary && clientY <= top) {
          this.#insertParagraphBefore(candidate);

          event.stop();
          return;
        } else if (clientY >= bottom && clientY <= bottomBoundary) {
          this.#insertParagraphAfter(candidate);

          event.stop();
          return;
        }
      }
    });
  }

  #insertParagraphBefore(element: ContainerElement): void {
    const { mapper } = this.editor.editing;

    // Check if the adjacent element is already paragraph.
    let paragraph: Element | undefined = undefined;
    if (element.previousSibling && element.previousSibling.is("element", "p")) {
      paragraph = mapper.toModelElement(element.previousSibling);
    } else {
      paragraph = undefined;
    }

    this.editor.model.change((writer) => {
      if (paragraph === undefined) {
        paragraph = writer.createElement("paragraph");

        const position = writer.createPositionBefore(
          mapper.toModelElement(element)!
        );
        writer.insert(paragraph, position);
      }

      writer.setSelection(paragraph, "end");
    });
  }

  #insertParagraphAfter(element: ContainerElement): void {
    const { mapper } = this.editor.editing;

    // Check if the adjacent element is already paragraph.
    let paragraph: Element | undefined = undefined;
    if (element.nextSibling && element.nextSibling.is("element", "p")) {
      paragraph = mapper.toModelElement(element.nextSibling);
    } else {
      paragraph = undefined;
    }

    this.editor.model.change((writer) => {
      if (paragraph === undefined) {
        paragraph = writer.createElement("paragraph");

        const position = writer.createPositionAfter(
          mapper.toModelElement(element)!
        );
        writer.insert(paragraph, position);
      }

      writer.setSelection(paragraph, "end");
    });
  }

  *#findPossibleBlocks(): IterableIterator<ContainerElement> {
    const { mapper, view } = this.editor.editing;

    const root = view.document.getRoot()!;
    const range = view.createRangeIn(root);
    for (const value of range.getWalker({ ignoreElementEnd: true })) {
      const node = value.item;
      if (!node.is("containerElement")) {
        continue;
      }

      const model = mapper.toModelElement(node);

      // Certain block elements such as `<ul>` or `<ol>` are inserted into the
      // view, but are not actually part of the model because there are only
      // <listItem>.
      if (model === undefined) {
        continue;
      }

      if (WoltlabMagicParagraph.blockModels.includes(model.name)) {
        yield node;
      }
    }
  }
}

export default WoltlabMagicParagraph;
