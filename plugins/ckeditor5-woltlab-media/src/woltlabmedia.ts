/**
 * Uploads files dropped onto the editor to the media system.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { Image } from "@ckeditor/ckeditor5-image";
import {
  WoltlabMetacode,
  WoltlabMetacodeUpcast,
} from "../../ckeditor5-woltlab-metacode";
import type { NodeAttributes } from "@ckeditor/ckeditor5-engine/src/model/node";

type MediaAlignment = "left" | "right" | "none" | "center";

export class WoltlabMedia extends Plugin {
  static get pluginName() {
    return "WoltlabMedia";
  }

  static get requires() {
    return [Image, WoltlabMetacode] as const;
  }

  init() {
    this.#setupImageElement();
  }

  #setupImageElement(): void {
    const { conversion, model } = this.editor;

    // We need to register a custom attribute to keep track of
    // images that have been uploaded as media..
    const { schema } = model;
    const imageTypes = ["imageBlock", "imageInline"];
    imageTypes.forEach((imageType) => {
      schema.extend(imageType, {
        allowAttributes: ["mediaId", "mediaSize"],
      });
    });

    conversion.attributeToAttribute({
      model: {
        key: "classList",
        values: ["woltlabSuiteMedia"],
      },
      view: {
        woltlabSuiteMedia: {
          name: "img",
          key: "class",
          value: "woltlabSuiteMedia",
        },
      },
    });

    const attributeMapping = new Map([
      ["mediaId", "data-media-id"],
      ["mediaSize", "data-media-size"],
    ]);

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
              let figure = undefined;
              if (img.is("element", "figure")) {
                figure = img;
                img = img.getChild(0);
              }
              if (img.is("element", "a")) {
                img = img.getChild(0);
              }

              if (!img.is("element", "img")) {
                return;
              }

              if (data.attributeNewValue !== null) {
                viewWriter.setAttribute(view, data.attributeNewValue, img);
                if (figure !== undefined) {
                  viewWriter.setAttribute(view, data.attributeNewValue, figure);
                }
              } else {
                viewWriter.removeAttribute(view, img);
                if (figure !== undefined) {
                  viewWriter.removeAttribute(view, figure);
                }
              }
            },
          );
        });
      });
    });
  }

  #upcastMedia(
    eventData: WoltlabMetacodeUpcast,
    resolveMediaUrl: ResolveMediaUrl,
    mediaId: number,
    mediaSize: string,
    mediaAlignment: MediaAlignment,
    imageSize: string,
  ): boolean {
    const { conversionApi, data } = eventData;
    const { consumable, writer } = conversionApi;
    const { viewItem } = data;

    const tagName = mediaAlignment !== "none" ? "imageBlock" : "imageInline";
    const image = writer.createElement(tagName);

    const attributes: NodeAttributes = {
      src: resolveMediaUrl(mediaId, mediaSize),
      classList: "woltlabSuiteMedia",
      mediaId,
      mediaSize,
      resizedWidth: imageSize,
    };
    if (mediaAlignment === "left") {
      attributes.imageStyle = "sideLeft";
    } else if (mediaAlignment === "right") {
      attributes.imageStyle = "side";
    }

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

export default WoltlabMedia;

type ResolveMediaUrl = (mediaId: number, mediaSize: string) => string;

type WoltlabMediaConfig = {
  resolveMediaUrl: ResolveMediaUrl;
};

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabMedia?: WoltlabMediaConfig;
  }
}
