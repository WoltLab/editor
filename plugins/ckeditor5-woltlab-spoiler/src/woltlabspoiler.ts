/**
 * Implements the spoiler widget inside the editor.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import WoltlabSpoilerEditing from "./woltlabspoilerediting";

export class WoltlabSpoiler extends Plugin {
  /**
   * @inheritDoc
   */
  static get requires() {
    return [WoltlabSpoilerEditing];
  }

  /**
   * @inheritDoc
   */
  static get pluginName() {
    return "WoltlabSpoiler";
  }
}

export default WoltlabSpoiler;
