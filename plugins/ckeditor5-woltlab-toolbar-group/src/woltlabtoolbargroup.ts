/**
 * Adds support for custom Font Awesome icons (using the `<fa-icon>` tag) for
 * button groups.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import type { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";

export class WoltlabToolbarGroup extends Plugin {
  static get pluginName() {
    return "WoltlabToolbarGroup";
  }

  init() {
    const options = this.editor.config.get("woltlabToolbarGroup") as
      | WoltlabToolbarGroupConfig
      | undefined;

    if (!options) {
      return;
    }

    this.editor.once("ready", () => {
      const editor = this.editor as ClassicEditor;
      const toolbarItems = editor.ui.view.toolbar.items;

      Object.entries(options).forEach(([name, item]) => {
        const viewItem = toolbarItems.find((view) => {
          if (
            view.element?.querySelector(
              `[data-cke-tooltip-text="woltlabToolbarGroup_${name}"]`
            ) !== null
          ) {
            return true;
          }

          return false;
        });
        const button = viewItem!.element as HTMLElement;
        const existingIcon = button.querySelector(
          ".ck-button__icon"
        ) as SVGElement;

        const [iconName, forceSolid] = item.icon.split(";", 2);

        const newIcon = document.createElement("fa-icon");
        (newIcon as any).setIcon(iconName, forceSolid === "true");

        existingIcon.replaceWith(newIcon);

        const label = button.querySelector(
          ".ck-button__label"
        ) as HTMLSpanElement;
        label.textContent = item.label;

        button.dataset.ckeTooltipText = item.label;
      });
    });
  }
}

export default WoltlabToolbarGroup;

type WoltlabToolbarGroupItem = {
  icon: string;
  label: string;
};

export type WoltlabToolbarGroupConfig = Record<string, WoltlabToolbarGroupItem>;

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabToolbarGroup?: WoltlabToolbarGroupConfig;
  }
}
