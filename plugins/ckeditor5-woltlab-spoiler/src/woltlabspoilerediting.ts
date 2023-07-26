/**
 * Creates and manages the spoiler widget inside the editor.
 *
 * The widget offers a plain text title that is used as the button title and an
 * editable block that accepts all sorts of other content.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { toWidget, toWidgetEditable, Widget } from "@ckeditor/ckeditor5-widget";

import { enablePlaceholder } from "@ckeditor/ckeditor5-engine";
import { ButtonView } from "@ckeditor/ckeditor5-ui";
import "../theme/woltlabspoiler.css";
import WoltlabSpoilerCommand from "./woltlabspoilercommand";

export class WoltlabSpoilerEditing extends Plugin {
  static get pluginName() {
    return "WoltlabSpoilerEditing";
  }

  static get requires() {
    return [Widget];
  }

  init() {
    this.#setupSchema();
    this.#setupConversion();

    this.editor.commands.add(
      "insertSpoiler",
      new WoltlabSpoilerCommand(this.editor),
    );

    this.#setupButton();
  }

  #setupButton() {
    const { t } = this.editor.locale;
    this.editor.ui.componentFactory.add("spoiler", (locale) => {
      const command = this.editor.commands.get("insertSpoiler")! as any;

      const buttonView = new ButtonView(locale);
      buttonView.set({
        label: t("Spoiler"),
        tooltip: true,
        withText: true,
      });

      buttonView.labelView.setTemplate({
        tag: "fa-icon",
        attributes: {
          name: "eye-slash",
        },
      });

      buttonView.bind("isOn").to(command, "value");
      buttonView.bind("isEnabled").to(command, "isEnabled");

      this.listenTo(buttonView, "execute", () =>
        this.editor.execute("insertSpoiler"),
      );

      return buttonView;
    });
  }

  #setupSchema(): void {
    const { schema } = this.editor.model;

    schema.register("spoiler", {
      allowWhere: "$block",
      isObject: true,
    });

    schema.register("spoilerTitle", {
      allowChildren: "$text",
      allowIn: "spoiler",
      isLimit: true,
    });

    schema.register("spoilerContent", {
      allowContentOf: "$root",
      allowIn: "spoiler",
      isLimit: true,
    });

    // The typings are outdated.
    schema.addChildCheck((context, childDefinition) => {
      if (
        childDefinition.name === "spoiler" &&
        Array.from(context.getNames()).includes("spoiler")
      ) {
        return false;
      }

      if (
        context.endsWith("spoilerContent") &&
        childDefinition.name === "spoiler"
      ) {
        return false;
      }

      if (
        context.endsWith("spoilerTitle") &&
        childDefinition.name !== "$text"
      ) {
        return false;
      }
    });

    // Disallow anything but plain text inside `<spoilerText>`.
    schema.addAttributeCheck((context) => {
      if (context.endsWith("spoilerTitle $text")) {
        return false;
      }
    });
  }

  #setupConversion(): void {
    const { conversion } = this.editor;
    const { t } = this.editor.locale;

    conversion.for("upcast").add((dispatcher) => {
      dispatcher.on("element:woltlab-spoiler", (_evt, data, conversionApi) => {
        const {
          consumable,
          writer,
          safeInsert,
          convertChildren,
          updateConversionResult,
        } = conversionApi;

        const { viewItem } = data;

        const wrapper = { name: true };

        if (!consumable.test(viewItem, wrapper)) {
          return;
        }

        const spoiler = writer.createElement("spoiler");

        const spoilerTitle = writer.createElement("spoilerTitle");
        writer.append(spoilerTitle, spoiler);

        const label = (viewItem.getAttribute("data-label") || "").trim();
        writer.appendText(label, spoilerTitle);

        const spoilerContent = writer.createElement("spoilerContent");
        writer.append(spoilerContent, spoiler);

        if (!safeInsert(spoiler, data.modelCursor)) {
          return;
        }

        consumable.consume(viewItem, wrapper);

        convertChildren(viewItem, spoilerContent);

        updateConversionResult(spoiler, data);
      });
    });

    conversion.for("dataDowncast").add((dispatcher) => {
      dispatcher.on("insert:spoiler", (_evt, data, conversionApi) => {
        const { item: modelElement } = data;
        const { consumable, mapper, writer } = conversionApi;

        if (modelElement.childCount !== 2) {
          return null;
        }

        const title = modelElement.getChild(0);
        if (!title.is("element", "spoilerTitle")) {
          return null;
        }

        if (!consumable.consume(modelElement, "insert")) {
          return;
        }

        consumable.consume(title, "insert");
        let label = "";
        if (title.childCount === 1) {
          const text = title.getChild(0);
          if (text.is("$text")) {
            label = text.data;
          }
        }

        const spoiler = writer.createContainerElement("woltlab-spoiler", {
          "data-label": label,
        });

        const position = mapper.toViewPosition(
          this.editor.model.createPositionBefore(modelElement),
        );
        writer.insert(position, spoiler);

        mapper.bindElements(modelElement, spoiler);

        mapper.bindElements(title, spoiler);

        const content = modelElement.getChild(1);
        if (content.is("element", "spoilerContent")) {
          mapper.bindElements(content, spoiler);
          consumable.consume(content, "insert");
        }
      });

      dispatcher.on("insert:$text", (evt, data, conversionApi) => {
        const parent = data.item.parent;
        if (parent && parent.is("element", "spoilerTitle")) {
          conversionApi.consumable.consume(data.item, "insert");
        }
      });
    });

    conversion
      .for("editingDowncast")
      .elementToElement({
        model: "spoiler",
        view: (_modelElement, { writer }) => {
          const div = writer.createContainerElement("div", {
            class: "ck-woltlabspoiler",
          });

          return toWidget(div, writer, {
            hasSelectionHandle: true,
            label: "spoiler widget",
          });
        },
      })
      .elementToElement({
        model: "spoilerTitle",
        view: (_modelElement, { writer }) => {
          const div = writer.createEditableElement("div", {
            class: "ck-woltlabspoiler__title",
            "data-label": t("Spoiler"),
          });

          enablePlaceholder({
            view: this.editor.editing.view,
            element: div,
            text: t("Type your title"),
            keepOnFocus: true,
          });

          return toWidgetEditable(div, writer);
        },
      })
      .elementToElement({
        model: "spoilerContent",
        view: (_modelElement, { writer }) => {
          const div = writer.createEditableElement("div", {
            class: "ck-woltlabspoiler__content",
          });

          return toWidgetEditable(div, writer);
        },
      });
  }
}

export default WoltlabSpoilerEditing;
