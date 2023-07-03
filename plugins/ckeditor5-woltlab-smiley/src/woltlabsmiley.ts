/**
 * Permits the `.smiley` class for inserted smileys.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import type { DowncastInsertEvent } from "@ckeditor/ckeditor5-engine";
import { Image } from "@ckeditor/ckeditor5-image";

import "../theme/woltlabsmiley.css";

export class WoltlabSmiley extends Plugin {
  static get pluginName() {
    return "WoltlabSmiley";
  }

  static get requires() {
    return [Image] as const;
  }

  init() {
    const { conversion, model } = this.editor;

    const imageTypes = ["imageBlock", "imageInline"];
    for (const imageType of imageTypes) {
      model.schema.extend(imageType, {
        allowAttributes: ["classList"],
      });
    }

    conversion.attributeToAttribute({
      model: "classList",
      view: {
        name: "img",
        key: "class",
        value: ["smiley"],
      },
    });

    conversion.for("editingDowncast").add((dispatcher) => {
      dispatcher.on<DowncastInsertEvent>(
        "insert:imageInline",
        (_evt, data, conversionApi) => {
          const { item } = data;

          if (item.getAttribute("classList") !== "smiley") {
            return;
          }

          if (!item.is("element")) {
            return;
          }

          const { mapper, writer } = conversionApi;

          // Inline images are widgetized which adds an outline when interacting
          // with, breaks the caret movement and offers a toolbar to modify the
          // positionining. Unfortunately, it is not possible to suppress this
          // behavior, but everything depends on the custom property flag "widget"
          // to check if it should offer any of these capabilities.
          const viewElement = mapper.toViewElement(item)!;
          writer.setCustomProperty("widget", false, viewElement);
        },
        { priority: "low" }
      );
    });
  }
}

export default WoltlabSmiley;
