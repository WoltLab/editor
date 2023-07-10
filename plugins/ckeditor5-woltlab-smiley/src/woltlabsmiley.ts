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

          const { consumable, mapper, writer } = conversionApi;

          if (!consumable.test(item, "insert")) {
            return;
          }

          consumable.consume(item, "insert");

          const image = writer.createEmptyElement("img");
          const position = mapper.toViewPosition(
            this.editor.model.createPositionBefore(item)
          );
          writer.insert(position, image);

          mapper.bindElements(item, image);
        },
        { priority: "high" }
      );
    });
  }
}

export default WoltlabSmiley;
