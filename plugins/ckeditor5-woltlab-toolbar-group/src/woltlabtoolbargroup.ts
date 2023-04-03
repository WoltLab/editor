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
      const toolbar = (this.editor.ui.view as any).toolbar.element;

      Object.entries(options).forEach(([name, item]) => {
        const button = toolbar.querySelector(
          `.ck-dropdown__button[data-cke-tooltip-text="woltlabToolbarGroup_${name}"]`
        ) as HTMLButtonElement;
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
