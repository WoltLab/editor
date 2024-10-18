/**
 * @author    Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license   LGPL-2.1-or-later
 * @since     6.2
 */
import { Plugin, Editor } from "@ckeditor/ckeditor5-core";
import { Database } from "emoji-picker-element";
import { Typing } from "@ckeditor/ckeditor5-typing";
import { createDropdown } from "@ckeditor/ckeditor5-ui";

import emojiIcon from "../theme/icons/smile.svg";
import WoltlabCoreEmojiPickerView from "./ui/woltlabcoreemojipickerview";
import { EventInfo } from "@ckeditor/ckeditor5-utils";
import { EmojiClickEvent } from "emoji-picker-element/shared";

export class WoltlabEmoji extends Plugin {
  constructor(editor: Editor) {
    super(editor);
  }

  public static get pluginName() {
    return "WoltlabEmoji" as const;
  }

  public static get requires() {
    return [Typing] as const;
  }

  public init(): void {
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

      if (!emojiPickerView.isRendered) {
        emojiPickerView.render();
      }

      dropdownView.panelView.children.add(emojiPickerView);

      return dropdownView;
    });
  }

  #emojiClicked(evt: EventInfo, emojiClickData: EmojiClickEvent) {
    const editor = this.editor;

    if ("unicode" in emojiClickData.detail) {
      editor.execute("input", { text: emojiClickData.detail.unicode });
    }

    editor.editing.view.focus();
  }
}

export type WoltlabEmojiConfig = {
  getDatabase(): Database;
};

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabEmojis?: WoltlabEmojiConfig;
  }
}
