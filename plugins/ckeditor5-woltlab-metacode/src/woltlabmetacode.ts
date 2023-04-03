/**
 * Converts unhandled bbcodes using the `<woltlab-metacode>` element into their
 * textual representation.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";

export class WoltlabMetacode extends Plugin {
  static get pluginName() {
    return "WoltlabMetacode";
  }

  init() {
    this.#setupConversion();
  }

  #setupConversion() {
    this.editor.conversion.for("upcast").add((dispatcher) => {
      dispatcher.on("element:woltlab-metacode", (_evt, data, conversionApi) => {
        const { consumable, writer } = conversionApi;
        const { viewItem } = data;

        const wrapper = { name: true };

        if (!consumable.test(viewItem, wrapper)) {
          return;
        }

        const name = viewItem.getAttribute("data-name");
        if (name === undefined) {
          return;
        }

        const attributes = this.#serializedAttributesToString(
          viewItem.getAttribute("data-attributes") || ""
        );

        const openingTag = writer.createText(`[${name}${attributes}]`);
        const closingTag = writer.createText(`[/${name}]`);

        let modelCursor = data.modelCursor;
        writer.insert(openingTag, modelCursor, 0);
        modelCursor = modelCursor.getShiftedBy(openingTag.offsetSize);

        writer.insert(closingTag, modelCursor, "end");

        data.modelCursor = modelCursor;
      });
    });
  }

  #serializedAttributesToString(serializedAttributes: string): string {
    if (serializedAttributes === "") {
      return "";
    }

    const stringifiedValues = atob(serializedAttributes);
    let values: (string | number)[];
    try {
      values = JSON.parse(stringifiedValues);
    } catch (e) {
      return "";
    }

    return (
      "=" +
      values
        .map((value) => {
          if (typeof value === "number") {
            return value.toString();
          }

          return `'${value}'`;
        })
        .join(",")
    );
  }
}

export default WoltlabMetacode;
