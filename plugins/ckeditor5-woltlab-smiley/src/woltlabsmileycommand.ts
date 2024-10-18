/**
 * @author    Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license   LGPL-2.1-or-later
 * @since     6.1
 *
 * {@link module:mention/mentioncommand}
 */

import { Command, Editor } from "@ckeditor/ckeditor5-core";
import { Range, Node } from "@ckeditor/ckeditor5-engine";

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

      // If a smiley is inserted at the beginning of a paragraph, `smileyRange`
      // is not the range of the smiley, but the entire paragraph in which the smiley was inserted.
      let element: Node | null = smileyRange.getContainedElement();
      let nodeAfter: Node | null = smileyRange.end.nodeAfter;
      if (element && element.is("element", "paragraph")) {
        element = element.getChild(0)!;
        nodeAfter = element!.nextSibling;
      }

      if (element) {
        writer.setSelection(element, "after");
      }

      // Don't add a white space if the smiley is followed by a white space.
      const isFollowedByWhiteSpace =
        nodeAfter && nodeAfter.is("$text") && nodeAfter.data.startsWith(" ");

      if (!isFollowedByWhiteSpace) {
        writer.setSelection(
          model.insertContent(
            writer.createText(" "),
            element ? element : range!.start.getShiftedBy(smileyText.length),
            "after",
          ).end,
        );
      }
    });
  }
}
