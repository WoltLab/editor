/**
 * Inserts extra buttons for BBCodes into the toolbar. Buttons have support for
 * Font Awesome icons through the `<fa-icon>` element.
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
    this.editor.editing.view.addObserver(ClickObserver);

    const viewDocument = this.editor.editing.view.document;

    this.listenTo<ViewDocumentClickEvent>(
      viewDocument,
      "click",
      (event, data) => {
        console.clear();

        const { domEvent, domTarget, target } = data;

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

        // Find any block element whose margin is possibly being clicked on.
        const { domConverter } = this.editor.editing.view;
        for (const candidate of this.#findPossibleBlocks()) {
          const domElement = domConverter.mapViewToDom(candidate)!;
          const { bottom, top } = domElement.getBoundingClientRect();
          const { marginBottom, marginTop } =
            window.getComputedStyle(domElement);

          const topBoundary = top - parseInt(marginTop);
          const bottomBoundary = bottom + parseInt(marginBottom);

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
      }
    );
  }

  #insertParagraphBefore(element: ContainerElement): void {
    // Check if the adjacent element is already paragraph.
    let paragraph: Element | undefined = undefined;
    if (element.previousSibling && element.previousSibling.is("element", "p")) {
      paragraph = this.editor.editing.mapper.toModelElement(
        element.previousSibling
      );
    } else {
      paragraph = undefined;
    }

    this.editor.model.change((writer) => {
      if (paragraph === undefined) {
        paragraph = writer.createElement("paragraph");

        const position = writer.createPositionBefore(
          this.editor.editing.mapper.toModelElement(element)!
        );
        writer.insert(paragraph, position);
      }

      writer.setSelection(paragraph, "end");
    });
  }

  #insertParagraphAfter(element: ContainerElement): void {
    // Check if the adjacent element is already paragraph.
    let paragraph: Element | undefined = undefined;
    if (element.nextSibling && element.nextSibling.is("element", "p")) {
      paragraph = this.editor.editing.mapper.toModelElement(
        element.nextSibling
      );
    } else {
      paragraph = undefined;
    }

    this.editor.model.change((writer) => {
      if (paragraph === undefined) {
        paragraph = writer.createElement("paragraph");

        const position = writer.createPositionAfter(
          this.editor.editing.mapper.toModelElement(element)!
        );
        writer.insert(paragraph, position);
      }

      writer.setSelection(paragraph, "end");
    });
  }

  *#findPossibleBlocks(): IterableIterator<ContainerElement> {
    const root = this.editor.editing.view.document.getRoot()!;
    const range = this.editor.editing.view.createRangeIn(root);
    for (const value of range.getWalker({ ignoreElementEnd: true })) {
      const node = value.item;
      if (!node.is("containerElement")) {
        continue;
      }

      const model = this.editor.editing.mapper.toModelElement(node);

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
