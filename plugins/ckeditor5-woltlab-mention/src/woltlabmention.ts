/**
 * Replaces the HTML of the builtin mention features.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import type { ViewText } from "@ckeditor/ckeditor5-engine";
import { Mention } from "@ckeditor/ckeditor5-mention";
import type { MentionAttribute } from "@ckeditor/ckeditor5-mention/src/mention";
import {
  WoltlabMetacode,
  type WoltlabMetacodeUpcast,
} from "../../ckeditor5-woltlab-metacode";

type WoltlabMentionAttribute = MentionAttribute & {
  objectId: number;
  type: "user";
};

export class WoltlabMention extends Plugin {
  static get pluginName() {
    return "WoltlabMention";
  }

  static get requires() {
    return [Mention, WoltlabMetacode] as const;
  }

  init() {
    const woltlabMetacode = this.editor.plugins.get(
      "WoltlabMetacode"
    ) as WoltlabMetacode;
    woltlabMetacode.on(
      "upcast",
      (eventInfo, eventData: WoltlabMetacodeUpcast) => {
        eventInfo.stop();

        if (eventData.name === "user" && eventData.attributes.length === 1) {
          if (!Number.isNaN(parseInt(eventData.attributes[0].toString()))) {
            this.#upcastMention(eventData);
          }
        }
      }
    );

    this.#setupDowncast();
  }

  #upcastMention(eventData: WoltlabMetacodeUpcast): void {
    const { attributes, conversionApi, data, name } = eventData;
    const { writer } = conversionApi;
    const { viewItem } = data;

    const text = viewItem.getChild(0) as ViewText;

    Object.assign(
      data,
      conversionApi.convertChildren(data.viewItem, data.modelCursor)
    );

    for (const node of Array.from(data.modelRange!.getItems())) {
      writer.setAttribute(
        "mention",
        {
          id: attributes[0].toString(),
          objectId: attributes[0],
          type: name,
          _text: text.data,
        } as WoltlabMentionAttribute,
        node
      );
    }
  }

  #setupDowncast(): void {
    this.editor.conversion.for("dataDowncast").attributeToElement({
      model: "mention",
      view: (modelAttributeValue: WoltlabMentionAttribute, { writer }) => {
        if (!modelAttributeValue) {
          return;
        }

        const id = modelAttributeValue.objectId;

        return writer.createAttributeElement(
          "woltlab-metacode",
          {
            "data-name": modelAttributeValue.type,
            "data-attributes": btoa(JSON.stringify([id])),
          },
          {
            priority: 20,
            id: modelAttributeValue.id,
          }
        );
      },
      converterPriority: "high",
    });
  }
}

export default WoltlabMention;
