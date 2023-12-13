/**
 * HTMLPurifier is unable to properly handle percentage based widths on both
 * `<img>` and `<figure>`: https://github.com/ezyang/htmlpurifier/issues/151
 *
 * This plugin will mirror the width attribute onto a special data attribute
 * that is recognized on the server.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import {
  DocumentSelection,
  DowncastConversionApi,
  DowncastInsertEvent,
  Element,
  type Item,
  Selection,
} from "@ckeditor/ckeditor5-engine";
import { DowncastAttributeEvent } from "@ckeditor/ckeditor5-engine/src/conversion/downcastdispatcher";

export class WoltlabImage extends Plugin {
  static get pluginName() {
    return "WoltlabImage";
  }

  init() {
    const { conversion } = this.editor;

    const imageTypes = ["imageBlock", "imageInline"] as const;

    for (const imageType of imageTypes) {
      conversion.for("dataDowncast").attributeToAttribute({
        model: {
          name: imageType,
          key: "data-width",
        },
        view: "data-width",
      });
      conversion.for("upcast").attributeToAttribute({
        view: {
          name: imageType === "imageBlock" ? "figure" : "img",
          key: "data-width",
        },
        model: "data-width",
      });

      conversion.for("dataDowncast").add((dispatcher) => {
        dispatcher.on<DowncastAttributeEvent>(
          `attribute:resizedWidth:${imageType}`,
          (_evt, data, conversionApi) => {
            this.#setResizeWidth(
              data.item,
              data.attributeNewValue,
              conversionApi,
            );
          },
          { priority: "lowest" },
        );
      });

      conversion.for("editingDowncast").add((dispatcher) => {
        dispatcher.on<DowncastInsertEvent>(
          `insert:${imageType}`,
          (_evt, { item }, conversionApi) => {
            const { mapper, writer } = conversionApi;
            const { domConverter } = this.editor.editing.view;

            const container = mapper.toViewElement(item as Element);
            if (
              !container ||
              !container.is("containerElement") ||
              container.childCount !== 1
            ) {
              return;
            }

            const viewElement = container.getChild(0)!;
            if (!viewElement.is("element")) {
              return;
            }

            const img = domConverter.viewToDom(viewElement);
            if (!(img instanceof HTMLImageElement)) {
              return;
            }

            const setMaxWidth = () => {
              writer.setStyle("max-width", `${img.naturalWidth}px`, container);
            };

            if (img.complete && img.naturalHeight !== 0) {
              setMaxWidth();
            } else {
              img.addEventListener("load", () => setMaxWidth(), { once: true });
            }
          },
        );

        dispatcher.on<DowncastAttributeEvent>(
          `attribute:resizedWidth:${imageType}`,
          (_evt, data, conversionApi) => {
            this.#setResizeWidth(
              data.item,
              data.attributeNewValue,
              conversionApi,
            );
          },
          { priority: "lowest" },
        );
      });
    }
  }

  #setResizeWidth(
    item: Item | Selection | DocumentSelection,
    width: unknown,
    conversionApi: DowncastConversionApi,
  ) {
    if (!item.is("element")) {
      return;
    }
    if (typeof width !== "string") {
      return;
    }

    const { mapper, writer } = conversionApi;

    const viewElement = mapper.toViewElement(item);
    if (viewElement === undefined) {
      return;
    }

    writer.setAttribute("data-width", width, viewElement);
  }
}

export default WoltlabImage;
