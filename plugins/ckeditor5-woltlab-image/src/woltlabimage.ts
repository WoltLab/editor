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
import { DowncastInsertEvent } from "@ckeditor/ckeditor5-engine";

export class WoltlabImage extends Plugin {
  static get pluginName() {
    return "WoltlabImage";
  }

  init() {
    this.editor.conversion.for("dataDowncast").add((dispatcher) => {
      dispatcher.on<DowncastInsertEvent>(
        "insert:imageInline",
        (_evt, data, conversionApi) => {
          const { item } = data;
          if (!item.is("element")) {
            return;
          }

          const width = item.getAttribute("width");
          if (typeof width !== "string") {
            return;
          }

          const { mapper, writer } = conversionApi;

          const viewElement = mapper.toViewElement(item);
          if (viewElement === undefined) {
            return;
          }

          writer.setAttribute("data-width", width, viewElement);
        },
        { priority: "lowest" }
      );

      dispatcher.on<DowncastInsertEvent>(
        "insert:imageBlock",
        (_evt, data, conversionApi) => {
          const { item } = data;
          if (!item.is("element")) {
            return;
          }

          const width = item.getAttribute("width");
          if (typeof width !== "string") {
            return;
          }

          const { mapper, writer } = conversionApi;

          const viewElement = mapper.toViewElement(item);
          if (viewElement === undefined) {
            return;
          }

          writer.setAttribute("data-width", width, viewElement);
        },
        { priority: "lowest" }
      );
    });
  }
}

export default WoltlabImage;
