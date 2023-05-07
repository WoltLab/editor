/**
 * Exports inline code as `<kbd>` instead of `<code>`.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Code } from "@ckeditor/ckeditor5-basic-styles";
import { Plugin } from "@ckeditor/ckeditor5-core";

export class WoltlabCode extends Plugin {
  static get pluginName() {
    return "WoltlabCode";
  }

  static get requires() {
    return [Code] as const;
  }

  init() {
    const { conversion } = this.editor;

    conversion.for("upcast").elementToAttribute({
      view: "kbd",
      model: "code",
      converterPriority: "high",
    });
    conversion.for("dataDowncast").attributeToElement({
      model: "code",
      view: "kbd",
      converterPriority: "high",
    });
  }
}

export default WoltlabCode;
