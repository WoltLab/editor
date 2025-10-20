/**
 * Autocomplete for emojis and smileys.
 * Overrides the default emoji mention feed to include smileys.
 *
 * @author Olaf Braun
 * @copyright 2001-2025 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.2
 *
 * @see https://raw.githubusercontent.com/ckeditor/ckeditor5/refs/tags/v45.0.0/packages/ckeditor5-emoji/src/emojimention.ts
 */

import { Plugin, Editor } from "@ckeditor/ckeditor5-core";
import {
  EmojiMention,
  EmojiRepository,
  EmojiPicker,
} from "@ckeditor/ckeditor5-emoji";
import {
  MentionFeed,
  MentionFeedObjectItem,
  MentionItemRenderer,
} from "@ckeditor/ckeditor5-mention";
import { EmojiSkinToneId } from "@ckeditor/ckeditor5-emoji";
import { LocaleTranslate } from "@ckeditor/ckeditor5-utils";
import { WoltlabSmileyCommand } from "./index";

const EMOJI_MENTION_MARKER = ":";
const EMOJI_SHOW_ALL_OPTION_ID = ":__EMOJI_SHOW_ALL:";
const EMOJI_HINT_OPTION_ID = ":__EMOJI_HINT:";

export class WoltlabSmileyMention extends Plugin {
  declare public emojiPickerPlugin: EmojiPicker | null;
  declare public emojiRepositoryPlugin: EmojiRepository;
  declare private _isEmojiRepositoryAvailable: boolean;
  declare private _emojiDropdownLimit: number;
  private readonly _skinTone: EmojiSkinToneId;

  constructor(editor: Editor) {
    super(editor);

    this._skinTone = editor.config.get("emoji.skinTone")!;

    this.#overrideMentionFeedConfig();
  }

  static get pluginName() {
    return "WoltlabSmileyMention";
  }

  static get requires() {
    return [EmojiRepository, "Mention", EmojiMention] as const;
  }

  public async init(): Promise<void> {
    this.editor.commands.add("smiley", new WoltlabSmileyCommand(this.editor));
    this.emojiPickerPlugin = this.editor.plugins.has("EmojiPicker")
      ? this.editor.plugins.get("EmojiPicker")
      : null;
    this.emojiRepositoryPlugin = this.editor.plugins.get("EmojiRepository");
    this._isEmojiRepositoryAvailable =
      await this.emojiRepositoryPlugin.isReady();

    if (this._isEmojiRepositoryAvailable) {
      this.editor.once("ready", () => this.#registerMentionCommand());
    }
  }

  #overrideMentionFeedConfig(): void {
    const mentionFeedsConfigs = this.editor.config.get(
      "mention.feeds",
    )! as Array<EmojiMentionFeed>;

    if (!mentionFeedsConfigs.some((config) => config._isEmojiMarker)) {
      return;
    }

    const config = mentionFeedsConfigs.find((config) => config._isEmojiMarker)!;
    this._emojiDropdownLimit = config.dropdownLimit!;
    config.feed = (searchString) => this.#queryEmojiAndSmileys(searchString);
    config.itemRenderer = this._customItemRendererFactory(this.editor.t);

    this.editor.config.set("mention.feeds", mentionFeedsConfigs);
  }

  private _customItemRendererFactory(t: LocaleTranslate): MentionItemRenderer {
    return (item: SmileyFeedObjectItem) => {
      const itemElement = document.createElement("button");

      itemElement.classList.add("ck");
      itemElement.classList.add("ck-button");
      itemElement.classList.add("ck-button_with-text");

      itemElement.id = `mention-list-item-id${item.id.slice(0, -1)}`;
      itemElement.type = "button";
      itemElement.tabIndex = -1;

      const labelElement = document.createElement("span");

      labelElement.classList.add("ck");
      labelElement.classList.add("ck-button__label");

      itemElement.appendChild(labelElement);

      if (item.id === EMOJI_HINT_OPTION_ID) {
        itemElement.classList.add("ck-list-item-button");
        itemElement.classList.add("ck-disabled");
        labelElement.textContent = t("Keep on typing to see the emoji.");
      } else if (item.id === EMOJI_SHOW_ALL_OPTION_ID) {
        labelElement.textContent = t("Show all emoji...");
      } else {
        if (item.isSmiley) {
          labelElement.classList.add("ck-smiley");
          labelElement.innerHTML = `${item.text} ${item.id}`;
        } else {
          labelElement.classList.add("ck-emoji");
          labelElement.textContent = `${item.text} ${item.id}`;
        }
      }

      return itemElement;
    };
  }

  #registerMentionCommand(): void {
    this.editor.commands.get("mention")!.on(
      "execute",
      (event, data) => {
        const eventData = data[0];

        if (eventData.marker !== EMOJI_MENTION_MARKER) {
          return;
        }

        if (!eventData.mention.isSmiley) {
          return;
        }

        event.stop();

        this.editor.execute("smiley", {
          smiley: eventData.mention.id,
          html: eventData.mention.text,
          range: eventData.range,
        });
      },
      { priority: "highest" },
    );
  }

  #queryEmojiAndSmileys(searchQuery: string): Array<SmileyFeedObjectItem> {
    // Do not show anything when a query starts with a space.
    if (searchQuery.startsWith(" ")) {
      return [];
    }

    // Do not show anything when a query starts with a marker character.
    if (searchQuery.startsWith(EMOJI_MENTION_MARKER)) {
      return [];
    }

    const result = [
      ...this.#filterEmojis(searchQuery),
      ...this.#filterSmileys(searchQuery),
    ];

    if (!this.emojiPickerPlugin) {
      return result.slice(0, this._emojiDropdownLimit);
    }

    const items = result.slice(0, this._emojiDropdownLimit - 1);
    if (items.length === 0) {
      return [];
    }

    const actionItem: SmileyFeedObjectItem = {
      id:
        searchQuery.length > 1
          ? EMOJI_SHOW_ALL_OPTION_ID
          : EMOJI_HINT_OPTION_ID,
    };

    return [...items, actionItem];
  }

  #filterEmojis(searchQuery: string): Array<SmileyFeedObjectItem> {
    if (!this._isEmojiRepositoryAvailable) {
      return [];
    }

    return this.emojiRepositoryPlugin
      .getEmojiByQuery(searchQuery)
      .map((emoji) => {
        let text = emoji.skins[this._skinTone] || emoji.skins.default;

        if (this.emojiPickerPlugin) {
          text =
            emoji.skins[this.emojiPickerPlugin.skinTone] || emoji.skins.default;
        }

        return {
          id: `:${emoji.annotation}:`,
          text,
        };
      });
  }

  #filterSmileys(searchQuery: string): Array<SmileyFeedObjectItem> {
    const woltlabSmileys = this.editor.config.get("woltlabSmileys") || [];

    return woltlabSmileys
      .filter((emoji) => {
        const code = emoji.code.substring(1, emoji.code.length - 1);
        return code.startsWith(searchQuery);
      })
      .map((emoji) => {
        return {
          isSmiley: true,
          id: emoji.code,
          text: emoji.html,
        };
      });
  }
}

export default WoltlabSmileyMention;

export type WoltlabSmileyItem = {
  code: string;
  html: string;
};

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabSmileys?: WoltlabSmileyItem[];
  }
}

type EmojiMentionFeed = MentionFeed & {
  _isEmojiMarker?: boolean;
};

type SmileyFeedObjectItem = MentionFeedObjectItem & {
  isSmiley?: boolean;
};
