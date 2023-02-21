/**
 * Extends the built-in code block to provide two extra attributes for the file
 * name and line number.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { getNormalizedAndLocalizedLanguageDefinitions } from "@ckeditor/ckeditor5-code-block/src/utils";
import { Plugin } from "@ckeditor/ckeditor5-core";
import { Element as CKEditorElement } from "@ckeditor/ckeditor5-engine";
import { createDropdown, SplitButtonView } from "@ckeditor/ckeditor5-ui";
import { first } from "@ckeditor/ckeditor5-utils";
import { WoltlabCodeBlockPanelView } from "./ui/woltlabcodeblockpanelview";

import type CodeBlockCommand from "@ckeditor/ckeditor5-code-block/src/codeblockcommand";
import type { EditorWithUI } from "@ckeditor/ckeditor5-core/src/editor/editorwithui";

const codeBlockIcon =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M12.87 12.61a.75.75 0 0 1-.089.976l-.085.07-3.154 2.254 3.412 2.414a.75.75 0 0 1 .237.95l-.057.095a.75.75 0 0 1-.95.237l-.096-.058-4.272-3.022-.003-1.223 4.01-2.867a.75.75 0 0 1 1.047.174zm2.795-.231.095.057 4.011 2.867-.003 1.223-4.272 3.022-.095.058a.75.75 0 0 1-.88-.151l-.07-.086-.058-.095a.75.75 0 0 1 .15-.88l.087-.07 3.412-2.414-3.154-2.253-.085-.071a.75.75 0 0 1 .862-1.207zM16 0a2 2 0 0 1 2 2v9.354l-.663-.492-.837-.001V2a.5.5 0 0 0-.5-.5H2a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 .5.5h3.118L7.156 19H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h14zM5.009 15l.003 1H3v-1h2.009zm2.188-2-1.471 1H5v-1h2.197zM10 11v.095L8.668 12H7v-1h3zm4-2v1H7V9h7zm0-2v1H7V7h7zm-4-2v1H5V5h5zM6 3v1H3V3h3z"/></svg>';

function attributeValueToString(
  value: string | number | boolean | undefined
): string {
  if (value === undefined) {
    return "";
  }

  return value.toString();
}

export class WoltlabCodeBlock extends Plugin {
  #command!: CodeBlockCommand;
  #lastView: WoltlabCodeBlockPanelView | undefined = undefined;

  static get pluginName() {
    return "WoltlabCodeBlock";
  }

  override init() {
    const editor = this.editor;
    this.#command = editor.commands.get("codeBlock")!;

    editor.model.schema.extend("codeBlock", {
      allowAttributes: ["file", "line"],
    });

    this.#setupCodeBlock();

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

  #setupCodeBlock(): void {
    const editor = this.editor;
    const t = editor.t;
    const componentFactory = (editor as EditorWithUI).ui.componentFactory;

    componentFactory.add("codeBlock", (locale) => {
      // TODO: The typings for `createDropdown()` are outdated.
      const dropdownView = createDropdown(locale, SplitButtonView as any);
      const splitButtonView = dropdownView.buttonView;

      splitButtonView.set({
        label: t("Insert code block"),
        tooltip: true,
        icon: codeBlockIcon,
        isToggleable: true,
      });

      splitButtonView
        .bind("isOn")
        .to(this.#command, "value", (value) => !!value);

      splitButtonView.on("execute", () => {
        editor.execute("codeBlock", {
          usePreviousLanguageChoice: false,
        });

        editor.editing.view.focus();
      });

      dropdownView.on("submit", (evt) => {
        const view = evt.path.find(
          (view) => view instanceof WoltlabCodeBlockPanelView
        );

        if (view instanceof WoltlabCodeBlockPanelView) {
          this.#lastView = view;

          editor.execute("codeBlock", {
            language: view.highlighter,
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

      const view = new WoltlabCodeBlockPanelView(editor);

      // We cannot use data binding for the custom attributes,
      // because the command does not know about them.
      dropdownView.on("change:isOpen", () => {
        if (dropdownView.isOpen) {
          const codeBlock = this.#getActiveCodeBlock();
          if (codeBlock) {
            view.file = attributeValueToString(codeBlock.getAttribute("file"));
            view.highlighter = attributeValueToString(
              codeBlock.getAttribute("language")
            );
            view.line = attributeValueToString(codeBlock.getAttribute("line"));
          } else {
            view.file = "";
            view.highlighter = "";
            view.line = "";
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
      "element:woltlab-ckeditor-codeblock",
      (_evt, data, conversionApi) => {
        const { viewItem } = data;
        const { consumable, writer } = conversionApi;

        const codeBlock = writer.createElement("codeBlock");
        writer.setAttributes(
          {
            file: viewItem.getAttribute("file") || "",
            language: viewItem.getAttribute("language") || "",
            line: viewItem.getAttribute("line") || "",
          },
          codeBlock
        );

        conversionApi.convertChildren(viewItem, codeBlock);

        if (!conversionApi.safeInsert(codeBlock, data.modelCursor)) {
          return;
        }

        consumable.consume(viewItem, { name: true });
        conversionApi.updateConversionResult(codeBlock, data);
      },
      { priority: "high" }
    );
  }

  #setupEditingDowncast(): void {
    const localizedLanguageDefs = getNormalizedAndLocalizedLanguageDefinitions(
      this.editor
    );

    this.editor.editing.downcastDispatcher.on(
      "insert:codeBlock",
      (_evt, data, conversionApi) => {
        const { writer, mapper, consumable } = conversionApi;

        if (!consumable.consume(data.item, "insert")) {
          return;
        }

        const codeBlockFile = attributeValueToString(
          data.item.getAttribute("file")
        );
        const codeBlockLanguage = attributeValueToString(
          data.item.getAttribute("language")
        );
        const codeBlockLine = attributeValueToString(
          data.item.getAttribute("line")
        );

        const code = writer.createContainerElement("code", {
          class: `language-${codeBlockLanguage}`,
        });

        const localizedLanguage = localizedLanguageDefs.find(
          (def) => def.language === codeBlockLanguage
        )!;
        let label = localizedLanguage.label;
        if (codeBlockFile || codeBlockLine) {
          label += " (";

          if (codeBlockFile) {
            label += codeBlockFile;
          }

          if (codeBlockLine) {
            if (codeBlockFile) {
              label += " ";
            }

            label += `@ ${codeBlockLine}`;
          }

          label += ")";
        }
        const pre = writer.createContainerElement(
          "pre",
          {
            "data-language": label,
            spellcheck: "false",
          },
          code
        );

        const targetViewPosition = mapper.toViewPosition(
          this.editor.model.createPositionBefore(data.item)
        );
        writer.insert(targetViewPosition, pre);

        mapper.bindElements(data.item, code);
      },
      { priority: "high" }
    );
  }

  #setupDowncast(): void {
    this.editor.data.downcastDispatcher.on(
      "insert:codeBlock",
      (_evt, data, conversionApi) => {
        const { writer, mapper, consumable } = conversionApi;

        if (!consumable.consume(data.item, "insert")) {
          return;
        }

        const codeBlockFile = attributeValueToString(
          data.item.getAttribute("file")
        );
        const codeBlockLanguage = attributeValueToString(
          data.item.getAttribute("language")
        );
        const codeBlockLine = attributeValueToString(
          data.item.getAttribute("line")
        );

        const targetViewPosition = mapper.toViewPosition(
          this.editor.model.createPositionBefore(data.item)
        );

        const pre = writer.createContainerElement(
          "woltlab-ckeditor-codeblock",
          {
            file: codeBlockFile,
            language: codeBlockLanguage,
            line: codeBlockLine,
          }
        );

        writer.insert(targetViewPosition, pre);
        mapper.bindElements(data.item, pre);
      },
      { priority: "high" }
    );
  }

  #updateCustomAttributes(lastView: WoltlabCodeBlockPanelView | undefined) {
    const codeBlock = this.#getActiveCodeBlock();
    if (codeBlock && lastView !== undefined) {
      this.editor.model.change((writer) => {
        writer.setAttribute("file", lastView.file, codeBlock);
        writer.setAttribute("line", lastView.line, codeBlock);
      });
    }
  }

  #getActiveCodeBlock(): CKEditorElement | null {
    const selection = this.editor.model.document.selection;
    const firstBlock = first(selection.getSelectedBlocks())!;
    const isCodeBlock = !!(firstBlock && firstBlock.is("element", "codeBlock"));

    return isCodeBlock ? firstBlock : null;
  }
}

export default WoltlabCodeBlock;
