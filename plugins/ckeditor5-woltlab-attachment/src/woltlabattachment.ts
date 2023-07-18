/**
 * Uploads files dropped onto the editor as an attachment.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { Image } from "@ckeditor/ckeditor5-image";
import type {
  WoltlabMetacode,
  WoltlabMetacodeUpcast,
} from "../../ckeditor5-woltlab-metacode/";

export class WoltlabAttachment extends Plugin {
  static get pluginName() {
    return "WoltlabAttachment";
  }

  static get requires() {
    return [Image] as const;
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
    });

    const attributeMapping = new Map([["attachmentId", "data-attachment-id"]]);

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
              let img = conversionApi.mapper.toViewElement(data.item);
              if (img.is("element", "figure")) {
                img = img.getChild(0);
              }

              if (!img.is("element", "img")) {
                return;
              }

              if (data.attributeNewValue !== null) {
                viewWriter.setAttribute(view, data.attributeNewValue, img);
                viewWriter.addClass("woltlabAttachment", img);
              } else {
                viewWriter.removeAttribute(view, img);
              }
            }
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
            imageElement
          );
        });
      });

    this.#setupAttachUpcast();
  }

  #setupAttachUpcast(): void {
    const options = this.editor.config.get(
      "woltlabAttachment"
    ) as WoltlabAttachmentConfig;

    const woltlabMetacode = this.editor.plugins.get(
      "WoltlabMetacode"
    ) as WoltlabMetacode;
    woltlabMetacode.on(
      "upcast",
      (eventInfo, eventData: WoltlabMetacodeUpcast) => {
        if (eventData.name !== "attach") {
          return;
        }

        const attachmentId = parseInt(eventData.attributes[0].toString());
        if (Number.isNaN(attachmentId)) {
          return;
        }

        if (!options.inlineImageIds.includes(attachmentId)) {
          return;
        }

        let floatBehavior = eventData.attributes[1]
          ? eventData.attributes[1].toString()
          : "none";
        if (
          floatBehavior !== "left" &&
          floatBehavior !== "right" &&
          floatBehavior !== "none"
        ) {
          floatBehavior = "none";
        }

        let isThumbnail = eventData.attributes[2] as unknown;
        if (typeof isThumbnail !== "boolean") {
          if (typeof isThumbnail === "string") {
            if (isThumbnail === "true") {
              isThumbnail = true;
            } else if (isThumbnail === "false") {
              isThumbnail = false;
            } else {
              isThumbnail = parseInt(isThumbnail);
              if (Number.isNaN(isThumbnail)) {
                isThumbnail = false;
              } else {
                if (isThumbnail === 0) {
                  isThumbnail = false;
                } else {
                  isThumbnail = true;
                }
              }
            }
          } else {
            isThumbnail = false;
          }
        }

        let width = eventData.attributes[3];
        if (
          width === undefined ||
          !/^(100%|\d{2}(\.\d{2})%)$/.test(width.toString())
        ) {
          width = "100%";
        }

        if (
          this.#upcastAttachment(
            eventData,
            options.resolveAttachmentUrl,
            attachmentId,
            floatBehavior as FloatBehavior,
            isThumbnail as boolean,
            width as string
          )
        ) {
          eventInfo.stop();
        }
      }
    );
  }

  #upcastAttachment(
    eventData: WoltlabMetacodeUpcast,
    resolveAttachUrl: ResolveAttachmentUrl,
    attachmentId: number,
    floatBehavior: FloatBehavior,
    isThumbnail: boolean,
    width: string
  ): boolean {
    const { conversionApi, data } = eventData;
    const { consumable, writer } = conversionApi;
    const { viewItem } = data;

    let model = "imageInline";
    let attributes: Record<string, unknown> = {
      attachmentId,
      src: resolveAttachUrl(attachmentId, isThumbnail),
      width,
    };

    if (floatBehavior === "left") {
      model = "imageBlock";
      attributes.imageStyle = "sideLeft";
    } else if (floatBehavior === "right") {
      model = "imageBlock";
      attributes.imageStyle = "side";
    }

    const image = writer.createElement(model);
    writer.setAttributes(attributes, image);

    conversionApi.convertChildren(viewItem, image);

    if (!conversionApi.safeInsert(image, data.modelCursor)) {
      return false;
    }

    consumable.consume(viewItem, { name: true });
    conversionApi.updateConversionResult(image, data);

    return true;
  }
}

export default WoltlabAttachment;

type FloatBehavior = "left" | "none" | "right";

type ResolveAttachmentUrl = (
  attachmentId: number,
  isThumbnail: boolean
) => string;

type WoltlabAttachmentConfig = {
  inlineImageIds: number[];
  resolveAttachmentUrl: ResolveAttachmentUrl;
};

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabAttachment?: WoltlabAttachmentConfig;
  }
}
