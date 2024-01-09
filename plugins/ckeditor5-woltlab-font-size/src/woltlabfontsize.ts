/**
 * Creates an "upcast" converter that converts the font size from the view to the model.
 * The converter finds the closest font size from the given list of font sizes.
 *
 * @author Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { ViewElement } from "@ckeditor/ckeditor5-engine";

export class WoltlabFontSize extends Plugin {
  static readonly defaultFontSize = 15;

  static get pluginName() {
    return "WoltlabFontSize";
  }

  init() {
    const fontSizes = this.editor.config
      .get("fontSize")!
      .options!.map((size) => {
        if (size === "default") {
          return WoltlabFontSize.defaultFontSize;
        }
        return size;
      }) as Array<number>;

    this.editor.conversion.for("upcast").elementToAttribute({
      model: {
        key: "fontSize",
        value: (viewElement: ViewElement) => {
          const fontSize = this.convertFontSizeToPx(
            viewElement.getStyle("font-size"),
          );
          if (fontSize === undefined) {
            return;
          }
          // Find the closest font size
          return (
            fontSizes.reduce((prev, curr) => {
              return Math.abs(curr - fontSize) < Math.abs(prev - fontSize)
                ? curr
                : prev;
            }) + "px"
          );
        },
      },
      view: {
        name: "span",
        styles: {
          "font-size": /.*/,
        },
      },
      converterPriority: "highest",
    });
  }

  convertFontSizeToPx(fontSize: string | undefined): number | undefined {
    if (fontSize === undefined) {
      return undefined;
    }

    const regex = /^(\d*\.?\d+)(px|pt|em|%)$/;
    const match = fontSize.match(regex);

    if (!match) {
      return undefined;
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    switch (unit) {
      case "px":
        return value;
      case "pt":
        return value * 1.33;
      case "em":
        return value * 16;
      case "%":
        return (value / 100) * WoltlabFontSize.defaultFontSize;
    }
  }
}

export default WoltlabFontSize;
