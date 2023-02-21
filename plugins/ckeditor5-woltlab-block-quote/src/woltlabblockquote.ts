/**
 * Modifies the existing blockquote feature to add two extra attributes for the
 * source and url.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { icons, Plugin } from "@ckeditor/ckeditor5-core";
import { Element as CKEditorElement } from "@ckeditor/ckeditor5-engine";
import { createDropdown, SplitButtonView } from "@ckeditor/ckeditor5-ui";
import { first } from "@ckeditor/ckeditor5-utils";
import { WoltlabBlockQuotePanelView } from "./ui/woltlabblockquotepanelview";

import "../theme/woltlabblockquote.css";

import type BlockQuoteCommand from "@ckeditor/ckeditor5-block-quote/src/blockquotecommand";
import type { EditorWithUI } from "@ckeditor/ckeditor5-core/src/editor/editorwithui";

function attributeValueToString(
  value: string | number | boolean | undefined
): string {
  if (value === undefined) {
    return "";
  }

  return value.toString();
}

export class WoltlabBlockQuote extends Plugin {
  #command: BlockQuoteCommand;
  #lastView: WoltlabBlockQuotePanelView | undefined = undefined;

  static get pluginName() {
    return "WoltlabBlockQuote";
  }

  override init() {
    const editor = this.editor;
    this.#command = editor.commands.get("blockQuote")!;

    editor.model.schema.extend("blockQuote", {
      allowAttributes: ["author", "link"],
    });

    this.#setupBlockQuote();

    this.#setupUpcast();
    this.#setupDowncast();
    this.#setupEditingDowncast();

    this.listenTo(
      this.#command,
      "execute",
      () => {
        this.#updateCustomAttributes(this.#lastView);
      },
      { priority: "high" }
    );
  }

  #setupBlockQuote(): void {
    const editor = this.editor;
    const t = editor.t;
    const componentFactory = (editor as EditorWithUI).ui.componentFactory;

    componentFactory.add("blockQuote", (locale) => {
      // TODO: The typing for `createDropdown()` are outdated.
      const dropdownView = createDropdown(locale, SplitButtonView as any);
      const splitButtonView = dropdownView.buttonView;

      splitButtonView.set({
        label: t("Insert block quote"),
        tooltip: true,
        icon: icons.quote,
        isToggleable: true,
      });

      splitButtonView
        .bind("isOn")
        .to(this.#command, "value", (value) => !!value);

      splitButtonView.on("execute", () => {
        editor.execute("blockQuote");

        editor.editing.view.focus();
      });

      dropdownView.on("submit", (evt) => {
        const view = evt.path.find(
          (view) => view instanceof WoltlabBlockQuotePanelView
        );

        if (view instanceof WoltlabBlockQuotePanelView) {
          this.#lastView = view;

          editor.execute("blockQuote", {
            forceValue: true,
          });

          this.#lastView = undefined;

          editor.editing.view.focus();
          dropdownView.isOpen = false;
        }
      });

      dropdownView.on("cancel", () => {
        editor.editing.view.focus();
        dropdownView.isOpen = false;
      });

      dropdownView.bind("isEnabled").to(this.#command);

      const view = new WoltlabBlockQuotePanelView(editor);

      // We cannot use data binding for the custom attributes,
      // because the command does not know about them.
      dropdownView.on("change:isOpen", () => {
        if (dropdownView.isOpen) {
          const blockQuote = this.#getActiveBlockQuote();
          if (blockQuote) {
            view.author = attributeValueToString(
              blockQuote.getAttribute("author")
            );
            view.link = attributeValueToString(blockQuote.getAttribute("link"));
          } else {
            view.author = "";
            view.link = "";
          }
        }
      });

      dropdownView.panelView.children.add(view);
      view.delegate("submit", "cancel").to(dropdownView);

      return dropdownView;
    });
  }

  #setupUpcast(): void {
    this.editor.data.upcastDispatcher.on(
      "element:woltlab-ckeditor-blockquote",
      (_evt, data, conversionApi) => {
        const { viewItem } = data;
        const { consumable, writer } = conversionApi;

        const blockQuote = writer.createElement("blockQuote");
        writer.setAttributes(
          {
            author: viewItem.getAttribute("author") || "",
            link: viewItem.getAttribute("link") || "",
          },
          blockQuote
        );

        conversionApi.convertChildren(viewItem, blockQuote);

        if (!conversionApi.safeInsert(blockQuote, data.modelCursor)) {
          return;
        }

        consumable.consume(viewItem, { name: true });
        conversionApi.updateConversionResult(blockQuote, data);
      },
      { priority: "high" }
    );
  }

  #setupEditingDowncast(): void {
    this.editor.editing.downcastDispatcher.on(
      "insert:blockQuote",
      (_evt, data, conversionApi) => {
        const { writer, mapper, consumable } = conversionApi;

        if (!consumable.consume(data.item, "insert")) {
          return;
        }

        const author = attributeValueToString(data.item.getAttribute("author"));
        const link = attributeValueToString(data.item.getAttribute("link"));
        const source = this.getSource(author, link);

        const attributes: Record<string, string> = {};
        if (source !== "") {
          attributes["data-source"] = source;
        }

        const blockquote = writer.createContainerElement(
          "blockquote",
          attributes
        );

        const targetViewPosition = mapper.toViewPosition(
          this.editor.model.createPositionBefore(data.item)
        );
        writer.insert(targetViewPosition, blockquote);

        mapper.bindElements(data.item, blockquote);
      },
      { priority: "high" }
    );

    this.editor.editing.downcastDispatcher.on(
      "attribute:author:blockQuote",
      (_evt, data, conversionApi) => {
        const { writer, mapper } = conversionApi;

        const author = attributeValueToString(data.attributeNewValue);
        const link = attributeValueToString(data.item.getAttribute("link"));
        const source = this.getSource(author, link);

        const blockquote = mapper.toViewElement(data.item);
        if (source === "") {
          writer.removeAttribute("data-source", blockquote);
        } else {
          writer.setAttribute("data-source", source, blockquote);
        }
      }
    );

    this.editor.editing.downcastDispatcher.on(
      "attribute:link:blockQuote",
      (_evt, data, conversionApi) => {
        const { writer, mapper } = conversionApi;

        const author = attributeValueToString(data.item.getAttribute("author"));
        const link = attributeValueToString(data.attributeNewValue);
        const source = this.getSource(author, link);

        const blockquote = mapper.toViewElement(data.item);
        if (source === "") {
          writer.removeAttribute("data-source", blockquote);
        } else {
          writer.setAttribute("data-source", source, blockquote);
        }
      }
    );
  }

  #setupDowncast(): void {
    this.editor.data.downcastDispatcher.on(
      "insert:blockQuote",
      (_evt, data, conversionApi) => {
        const { writer, mapper, consumable } = conversionApi;

        if (!consumable.consume(data.item, "insert")) {
          return;
        }

        const author = attributeValueToString(data.item.getAttribute("author"));
        const link = attributeValueToString(data.item.getAttribute("link"));

        const targetViewPosition = mapper.toViewPosition(
          this.editor.model.createPositionBefore(data.item)
        );

        const pre = writer.createContainerElement(
          "woltlab-ckeditor-blockquote",
          { author, link }
        );

        writer.insert(targetViewPosition, pre);
        mapper.bindElements(data.item, pre);
      },
      { priority: "high" }
    );
  }

  #updateCustomAttributes(lastView: WoltlabBlockQuotePanelView | undefined) {
    const blockQuote = this.#getActiveBlockQuote();
    if (blockQuote && lastView !== undefined) {
      this.editor.model.change((writer) => {
        writer.setAttribute("author", lastView.author, blockQuote);
        writer.setAttribute("link", lastView.link, blockQuote);
      });
    }
  }

  #getActiveBlockQuote(): CKEditorElement | null {
    const selection = this.editor.model.document.selection;
    const firstBlock = first(selection.getSelectedBlocks())!;

    return this.#findBlockQuoteParent(firstBlock);
  }

  #findBlockQuoteParent(element: CKEditorElement): CKEditorElement | null {
    if (element.is("element", "blockQuote")) {
      return element;
    }

    if (element.parent && !element.parent.is("element", "$root")) {
      return this.#findBlockQuoteParent(element.parent as CKEditorElement);
    }

    return null;
  }

  getSource(author: string, link: string): string {
    const components: string[] = [];
    if (author) {
      components.push(author);
    }
    if (link) {
      components.push(link);
    }

    return components.join(", ");
  }
}

export default WoltlabBlockQuote;
