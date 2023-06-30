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
import type {
  UpcastElementEvent,
  UpcastConversionApi,
  UpcastConversionData,
  ViewElement,
} from "@ckeditor/ckeditor5-engine";
import { EventInfo } from "@ckeditor/ckeditor5-utils";

type Attributes = (number | string)[];

export class WoltlabMetacode extends Plugin {
  static get pluginName() {
    return "WoltlabMetacode";
  }

  init() {
    this.#setupConversion();
  }

  #setupConversion() {
    this.editor.conversion.for("upcast").add((dispatcher) => {
      dispatcher.on<UpcastElementEvent>(
        "element:woltlab-metacode",
        (_evt, data, conversionApi) => {
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

          const attributes = this.#unserializeAttributes(
            viewItem.getAttribute("data-attributes") || ""
          );

          const eventInfo = new EventInfo(this, "upcast");
          const eventData: WoltlabMetacodeUpcast = {
            attributes,
            conversionApi,
            data,
            name,
          };
          this.fire(eventInfo, eventData);
          if (eventInfo.stop.called) {
            return;
          }

          const attributeString =
            this.#serializedAttributesToString(attributes);
          const openingTag = writer.createText(`[${name}${attributeString}]`);
          const closingTag = writer.createText(`[/${name}]`);

          let modelCursor = data.modelCursor;
          writer.insert(openingTag, modelCursor, 0);
          modelCursor = modelCursor.getShiftedBy(openingTag.offsetSize);

          writer.insert(closingTag, modelCursor, "end");

          data.modelCursor = modelCursor;
        }
      );
    });
  }

  #unserializeAttributes(serializedAttributes: string): Attributes {
    if (serializedAttributes === "") {
      return [];
    }

    const stringifiedValues = atob(serializedAttributes);
    let values: Attributes;
    try {
      values = JSON.parse(stringifiedValues);
    } catch (e) {
      return [];
    }

    return values;
  }

  #serializedAttributesToString(attributes: Attributes): string {
    if (attributes.length === 0) {
      return "";
    }

    return (
      "=" +
      attributes
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

export type WoltlabMetacodeUpcast = {
  attributes: Attributes;
  conversionApi: UpcastConversionApi;
  data: UpcastConversionData<ViewElement>;
  name: string;
};
