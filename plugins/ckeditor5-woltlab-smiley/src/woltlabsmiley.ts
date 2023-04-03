/**
 * Permits the `.smiley` class for inserted smileys.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";

export class WoltlabSmiley extends Plugin {
  static get pluginName() {
    return "WoltlabSmiley";
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
  }
}

export default WoltlabSmiley;
