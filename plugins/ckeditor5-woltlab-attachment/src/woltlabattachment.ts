/**
 * Uploads files dropped onto the editor as an attachment.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { Image, ImageUtils } from "@ckeditor/ckeditor5-image";

export class WoltlabAttachment extends Plugin {
  static get pluginName() {
    return "WoltlabAttachment";
  }

  static get requires() {
    return [Image, ImageUtils] as const;
  }

  init() {
    const { conversion, model, plugins } = this.editor;

    // We need to register a custom attribute to keep track of
    // images that have been uploaded as attachment. This will
    // make it possible to recognize images and remove them from
    // the editor when deleting an attachment.
    const { schema } = model;
    const imageTypes = ["imageBlock", "imageInline"];
    imageTypes.forEach((imageType) => {
      schema.extend(imageType, {
        allowAttributes: ["attachmentId"],
      });

      conversion.attributeToAttribute({
        model: {
          key: "classList",
          values: ["woltlabAttachment"],
        },
        view: {
          woltlabAttachment: {
            name: imageType === "imageBlock" ? "figure" : "img",
            key: "class",
            value: "woltlabAttachment",
          },
        },
      });
    });

    const attributeMapping = new Map([["attachmentId", "data-attachment-id"]]);
    const imageUtils = this.editor.plugins.get("ImageUtils");

    Array.from(attributeMapping.entries()).forEach(([model, view]) => {
      conversion.for("upcast").attributeToAttribute({
        view,
        model,
      });

      conversion.for("downcast").add((dispatcher) => {
        imageTypes.forEach((imageType) => {
          dispatcher.on(
            `attribute:${model}:${imageType}`,
            (evt, data, conversionApi) => {
              if (!conversionApi.consumable.consume(data.item, evt.name)) {
                return;
              }

              const viewWriter = conversionApi.writer;
              const img = imageUtils.findViewImgElement(
                conversionApi.mapper.toViewElement(data.item),
              );

              if (data.attributeNewValue !== null) {
                viewWriter.setAttribute(view, data.attributeNewValue, img);
                viewWriter.addClass("woltlabAttachment", img);
              } else {
                viewWriter.removeAttribute(view, img);
              }
            },
          );
        });
      });
    });

    plugins
      .get("ImageUploadEditing")
      .on("uploadComplete", (_evt, { data, imageElement }) => {
        model.change((writer) => {
          writer.setAttribute(
            "attachmentId",
            data["data-attachment-id"],
            imageElement,
          );
        });
      });
  }
}

export default WoltlabAttachment;
