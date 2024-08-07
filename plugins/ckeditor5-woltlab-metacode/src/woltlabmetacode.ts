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
    this.editor.data.htmlProcessor.domConverter.inlineObjectElements.push(
      "woltlab-metacode",
    );
    this.editor.editing.view.domConverter.inlineObjectElements.push(
      "woltlab-metacode",
    );

    this.#setupConversion();
  }

  #setupConversion() {
    this.editor.conversion.for("upcast").add((dispatcher) => {
      dispatcher.on<UpcastElementEvent>(
        "element:woltlab-metacode",
        (_evt, data, conversionApi) => {
          const { consumable, convertChildren, writer } = conversionApi;
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
            viewItem.getAttribute("data-attributes") || "",
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

          let { modelCursor } = data;

          const attributeString =
            this.#serializedAttributesToString(attributes);
          const openingTag = writer.createText(`[${name}${attributeString}]`);
          const closingTag = writer.createText(`[/${name}]`);
          const parent = modelCursor.parent;

          // Check if the BBCode appears to be a block element.
          let isBlockElement = false;
          const ancestors = modelCursor.getAncestors();
          if (ancestors[ancestors.length - 1].name === "$root") {
            isBlockElement = true;
          } else if (parent.name === "blockQuote") {
            // Text nodes may only appear inside block nodes.
            isBlockElement = true;
          } else {
            for (const child of viewItem.getChildren()) {
              if (child.is("containerElement")) {
                isBlockElement = true;
                break;
              }
            }
          }

          if (isBlockElement) {
            let paragraph = writer.createElement("paragraph");
            writer.insert(openingTag, paragraph);
            writer.insert(paragraph, modelCursor);
            modelCursor = writer.createPositionAfter(paragraph);

            const result = convertChildren(viewItem, modelCursor);

            paragraph = writer.createElement("paragraph");
            writer.insert(closingTag, paragraph);
            writer.insert(paragraph, result.modelCursor);

            data.modelCursor = writer.createPositionAfter(paragraph);
          } else {
            writer.insert(openingTag, modelCursor);
            modelCursor = modelCursor.getShiftedBy(openingTag.offsetSize);

            const result = convertChildren(viewItem, modelCursor);

            writer.insert(closingTag, result.modelCursor);
            data.modelCursor = result.modelCursor.getShiftedBy(
              closingTag.offsetSize,
            );
          }
        },
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
