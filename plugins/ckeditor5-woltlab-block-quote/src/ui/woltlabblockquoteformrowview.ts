/**
 * Helper class for the editing UI of quote blocks.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { View, ViewCollection } from "@ckeditor/ckeditor5-ui";
import { Locale } from "@ckeditor/ckeditor5-utils";

import "../../theme/woltlabblockquoteformrowview.css";

type Options = {
  children?: View[];
  class?: string;
};

export class WoltlabBlockQuoteFormRowView extends View {
  declare class: string;
  readonly children: ViewCollection;

  constructor(locale: Locale, options: Options = {}) {
    super(locale);

    const bind = this.bindTemplate;

    this.set("class", options.class || null);

    this.children = this.createCollection();

    if (options.children) {
      options.children.forEach((child) => this.children.add(child));
    }

    this.setTemplate({
      tag: "div",
      attributes: {
        class: ["ck", "ck-form__row", bind.to("class")],
      },
      children: this.children,
    });
  }
}

export default WoltlabBlockQuoteFormRowView;
