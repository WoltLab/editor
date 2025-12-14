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
import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import { ButtonView } from "@ckeditor/ckeditor5-ui";

export class WoltlabCode extends Plugin {
  static get pluginName() {
    return "WoltlabCode";
  }

  static get requires() {
    return [Code] as const;
  }

  init() {
    const { conversion, ui } = this.editor;

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

    // Replace the label of the “Code” button with “Single line code”.
    this.editor.once("ready", () => {
      const { ui, t } = this.editor as ClassicEditor;

      const targetLabel = t("Code");
      const item = ui.view.toolbar!.items.find((item) => {
        if (item instanceof ButtonView && item.label === targetLabel) {
          return true;
        }

        return false;
      }) as ButtonView | undefined;

      if (item !== undefined) {
        item.label = t("Single line code");
      }
    });
  }
}

export default WoltlabCode;
