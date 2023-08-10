/**
 * Inserts a bbcode at the caret position.
 *
 * Fires an event on the source element to allow the insertion to be
 * intercepted.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Command } from "@ckeditor/ckeditor5-core";

export class WoltlabBbcodeCommand extends Command {
  override execute(bbcode: string) {
    const { editing, model } = this.editor;

    const sourceElement = (this.editor as any).sourceElement as HTMLElement;

    const event = new CustomEvent<{ bbcode: string }>("ckeditor5:bbcode", {
      cancelable: true,
      detail: {
        bbcode,
      },
    });
    sourceElement.dispatchEvent(event);

    if (event.defaultPrevented) {
      return;
    }

    model.change((writer) => {
      const selection = model.document.selection;

      const openingTag = `[${bbcode}]`;
      model.insertContent(
        writer.createText(openingTag),
        selection.getFirstPosition(),
      );

      const range = model.insertContent(
        writer.createText(`[/${bbcode}]`),
        selection.getLastPosition(),
      );

      const newRange = writer.createRange(range.start);
      writer.setSelection(newRange);

      editing.view.focus();
    });
  }

  override refresh() {
    this.isEnabled = this.#getIsEnabled();
  }

  #getIsEnabled(): boolean {
    const { document, schema } = this.editor.model;
    const { selection } = document;

    // Any context that accepts bold text is also valid
    // for the insertion of bbcodes. This check is in place
    // to avoid offering these buttons in contexts that only
    // accept plain text, such a spoiler labels.
    return schema.checkAttributeInSelection(selection, "bold");
  }
}

export default WoltlabBbcodeCommand;
