/**
 * @author Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.1
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { Typing } from "@ckeditor/ckeditor5-typing";
import { createDropdown } from "@ckeditor/ckeditor5-ui";
import emojiIcon from "../theme/icons/smile.svg";
import WoltlabCoreEmojiPickerView from "./ui/woltlabcoreemojipickerview";
import { EventInfo } from "@ckeditor/ckeditor5-utils";
import { Database } from "emoji-picker-element";
import { EmojiClickEvent } from "emoji-picker-element/shared";

export class WoltlabEmoji extends Plugin {
  #database?: Database = undefined;

  static get pluginName() {
    return "WoltlabEmoji";
  }

  static get requires() {
    return [Typing];
  }

  init() {
    const editor = this.editor;
    const inputCommand = editor.commands.get("input")!;

    editor.ui.componentFactory.add("WoltlabEmoji", (locale) => {
      const dropdownView = createDropdown(locale);
      dropdownView.buttonView.set({
        label: editor.t("Emoji"),
        icon: emojiIcon,
        tooltip: true,
      });
      dropdownView.bind("isEnabled").to(inputCommand);

      const emojiPickerView = new WoltlabCoreEmojiPickerView(locale);
      this.listenTo(
        emojiPickerView,
        "emoji-click",
        this.#emojiClicked.bind(this),
      );

      this.#registerDatabase(emojiPickerView.getDatabase()!);

      dropdownView.panelView.children.add(emojiPickerView);

      return dropdownView;
    });
  }

  #emojiClicked(evt: EventInfo, emojiClickData: EmojiClickEvent) {
    const editor = this.editor;

    if ("unicode" in emojiClickData.detail) {
      editor.execute("input", { text: emojiClickData.detail.unicode });
    } else {
      // TODO custom emoji
    }

    editor.editing.view.focus();
  }

  #registerDatabase(database: Database) {
    if (this.#database !== undefined) {
      return;
    }

    this.#database = database;

    // TODO register keydown event listener
  }
}

export default WoltlabEmoji;
