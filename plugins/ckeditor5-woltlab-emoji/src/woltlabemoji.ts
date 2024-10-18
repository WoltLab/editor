/**
 * @author    Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license   LGPL-2.1-or-later
 * @since     6.2
 */
import { Plugin } from "@ckeditor/ckeditor5-core";
import { Database } from "emoji-picker-element";

export class WoltlabEmoji extends Plugin {}

export type WoltlabEmojiConfig = {
  getDatabase(): Database;
};

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabEmojis: WoltlabEmojiConfig;
  }
}
