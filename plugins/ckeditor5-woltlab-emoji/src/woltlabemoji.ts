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

export class WoltlabEmoji extends Plugin {
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

      const customElementView = new WoltlabCoreEmojiPickerView(locale);
      dropdownView.panelView.children.add(customElementView);

      return dropdownView;
    });
  }
}

export default WoltlabEmoji;
