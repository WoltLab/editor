/**
 * Disables the AutoLink plugin during the normal editing to prevent incorrect
 * transformations and to defer the link detection to the server side. Pasting
 * a link while having an active text selection is selectively enabled.
 *
 * @author Alexander Ebert
 * @copyright 2001-2024 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { AutoLink } from "@ckeditor/ckeditor5-link";

export class WoltlabAutoLink extends Plugin {
  readonly #key = "WoltlabAutoLink";

  static get pluginName() {
    return "WoltlabAutoLink" as const;
  }

  static get requires() {
    return [AutoLink] as const;
  }

  init() {
    if (!this.editor.plugins.has(AutoLink)) {
      return;
    }

    // Unconditionally disable the `AutoLink` plugin which interferes with our
    // own link detection and all creates potentially invalid links.
    // See https://github.com/ckeditor/ckeditor5/issues/14497
    const autoLink = this.editor.plugins.get(AutoLink);
    autoLink.forceDisabled(this.#key);

    // Replacing text with a link from clipboard is provided by the `AutoLink`
    // plugin, requiring us to enable the plugin for the duration of the paste.
    //
    // AutoLink’s event listener uses the "high" priority.
    const clipboardPipeline = this.editor.plugins.get("ClipboardPipeline");
    clipboardPipeline.on(
      "inputTransformation",
      () => {
        autoLink.clearForceDisabled(this.#key);
      },
      { priority: "highest" },
    );

    clipboardPipeline.on(
      "inputTransformation",
      () => {
        autoLink.forceDisabled(this.#key);
      },
      { priority: "normal" },
    );
  }
}

export default WoltlabAutoLink;
