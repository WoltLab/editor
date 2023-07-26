/**
 * Uploads files dropped onto the editor as an attachment.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Autosave } from "@ckeditor/ckeditor5-autosave";
import { Plugin } from "@ckeditor/ckeditor5-core";

export class WoltlabAutosave extends Plugin {
  static get pluginName() {
    return "WoltlabAutosave";
  }

  static get requires() {
    return [Autosave] as const;
  }

  init() {
    // Disables the confirmation dialog before navigating away from the current
    // page. See https://github.com/WoltLab/editor/issues/21
    const pendingActions = this.editor.plugins.get("PendingActions");
    pendingActions.hasAny = false;
    pendingActions.on(
      "set:hasAny",
      (event) => {
        event.return = false;
        event.stop();
      },
      { priority: "highest" },
    );
  }
}

export default WoltlabAutosave;
