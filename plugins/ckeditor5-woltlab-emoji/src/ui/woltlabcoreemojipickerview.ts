/**
 * @author Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.1
 */

import { View, FocusableView } from "@ckeditor/ckeditor5-ui";
import { Locale } from "@ckeditor/ckeditor5-utils";

import "../../theme/woltlabemoji.css";

export class WoltlabCoreEmojiPickerView extends View implements FocusableView {
  constructor(locale: Locale) {
    super(locale);

    const bind = this.bindTemplate;

    this.setTemplate({
      tag: "woltlab-core-emoji-picker",
      attributes: {
        class: ["ck", "ck-woltlab-core-emoji-picker"],
      },
      on: {
        "emoji-click": bind.to("emoji-click"),
      },
    });
  }

  focus(): void {
    this.element?.focus();
  }
}

export default WoltlabCoreEmojiPickerView;
