/**
 * @author    Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license   LGPL-2.1-or-later
 * @since     6.1
 */

import { Editor, Plugin } from "@ckeditor/ckeditor5-core";
import { ContextualBalloon } from "@ckeditor/ckeditor5-ui";
import {
  TextWatcher,
  TextWatcherMatchedEvent,
} from "@ckeditor/ckeditor5-typing";

const PATTERN = new RegExp(/:[\w_]+/g);
const MARKER_NAME = "smiley";

export class WoltlabSmileyUi extends Plugin {
  /**
   * @inheritDoc
   */
  constructor(editor: Editor) {
    super(editor);
  }

  /**
   * @inheritDoc
   */
  public static get pluginName() {
    return "WoltlabSmileyUI" as const;
  }

  /**
   * @inheritDoc
   */
  public static get requires() {
    return [ContextualBalloon] as const;
  }

  /**
   * @inheritDoc
   */
  public init(): void {
    this.#registerTextWatcher();
  }

  #registerTextWatcher() {
    const editor = this.editor;
    const watcher = new TextWatcher(editor.model, (text: string) => {
      const position = getLastPosition(text);
      if (position === undefined) {
        return false;
      }

      return text.substring(position).match(PATTERN);
    });
    watcher.on<TextWatcherMatchedEvent>("matched", (evt, data) => {
      const position = getLastPosition(data.text);
      const selection = editor.model.document.selection;
      const focus = selection.focus;
      const markerPosition = editor.model.createPositionAt(
        focus!.parent,
        position!,
      );
      const end = markerPosition.getShiftedBy(1);
      const markerRange = editor.model.createRange(markerPosition, end);

      if (checkIfMarkerExists(editor)) {
        // Update marker position
        const mentionMarker = editor.model.markers.get(MARKER_NAME)!;
        editor.model.change((writer) => {
          writer.updateMarker(mentionMarker, { range: markerRange });
        });
      } else {
        // Create new marker
        editor.model.change((writer) => {
          writer.addMarker(MARKER_NAME, {
            range: markerRange,
            usingOperation: false,
            affectsData: false,
          });
        });
      }
    });
    watcher.on("unmatched", () => {
      //TODO
    });
  }
}

function getLastPosition(text: string): number | undefined {
  const lastIndex = text.lastIndexOf(":");
  if (lastIndex === -1 || !text.substring(lastIndex - 1).match(PATTERN)) {
    return undefined;
  }

  return lastIndex;
}

function checkIfMarkerExists(editor: Editor): boolean {
  return editor.model.markers.has(MARKER_NAME);
}
