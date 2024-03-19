/**
 * @author    Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license   LGPL-2.1-or-later
 * @since     6.1
 *
 * {@link module:mention/mentioncommand}
 */

import { Command, Editor } from "@ckeditor/ckeditor5-core";
import { Range } from "@ckeditor/ckeditor5-engine";

export default class WoltlabSmileyCommand extends Command {
  /**
   * @inheritDoc
   */
  public constructor(editor: Editor) {
    super(editor);

    // Since this command may pass range in execution parameters, it should be checked directly in execute block.
    this._isEnabledBasedOnSelection = false;
  }

  /**
   * @inheritDoc
   */
  public override execute(options: {
    smiley: string | { id: string; [key: string]: unknown };
    html?: string;
    range?: Range;
  }): void {
    const model = this.editor.model;
    const document = model.document;
    const selection = document.selection;

    const smileyData =
      typeof options.smiley == "string"
        ? { id: options.smiley }
        : options.smiley;
    const smileyID = smileyData.id;

    const range = options.range || selection.getFirstRange();

    // Don't execute command if range is in non-editable place.
    if (!model.canEditAt(range)) {
      return;
    }

    const smileyText = options.html || smileyID;

    model.change((writer) => {
      const viewFragment = this.editor.data.processor.toView(smileyText);
      const modelFragment = this.editor.data.toModel(viewFragment);

      const smileyRange = model.insertContent(modelFragment, range);
      writer.setSelection(
        model.insertContent(writer.createText(" "), smileyRange.end).end,
      );
    });
  }
}
