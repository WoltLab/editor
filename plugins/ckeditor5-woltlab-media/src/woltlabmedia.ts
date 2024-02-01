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
import { WoltlabMetacode } from "../../ckeditor5-woltlab-metacode";

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
