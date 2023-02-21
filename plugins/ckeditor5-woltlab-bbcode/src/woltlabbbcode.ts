/**
 * Inserts extra buttons for BBCodes into the toolbar. Buttons have support for
 * Font Awesome icons through the `<fa-icon>` element.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Command, Plugin } from "@ckeditor/ckeditor5-core";
import { ButtonView } from "@ckeditor/ckeditor5-ui";
import WoltlabBbcodeCommand from "./woltlabbbcodecommand";

import type { EditorWithUI } from "@ckeditor/ckeditor5-core/src/editor/editorwithui";
import type ComponentFactory from "@ckeditor/ckeditor5-ui/src/componentfactory";

export class WoltlabBbcode extends Plugin {
  static get pluginName() {
    return "WoltlabBbcode";
  }

  override init() {
    const editor = this.editor as EditorWithUI;
    const { componentFactory } = editor.ui;

    const options = editor.config.get("woltlabBbcode") as WoltlabBbcodeConfig;

    if (!options) {
      return;
    }

    const command = new WoltlabBbcodeCommand(editor);
    this.editor.commands.add("insertBbcode", command);

    for (const item of options) {
      this.#initButton(item, componentFactory, command);
    }
  }

  #initButton(
    item: WoltlabBbcodeButton,
    componentFactory: ComponentFactory,
    command: Command
  ): void {
    const { icon, name, label } = item;

    componentFactory.add(`woltlabBbcode_${name}`, () => {
      const button = new ButtonView();
      button.label = label;
      button.tooltip = true;
      button.withText = true;

      if (icon) {
        const [iconName, useSolid] = icon.split(";", 2);
        let attributes: Record<string, string> = {
          name: iconName,
        };
        if (useSolid === "true") {
          attributes.solid = "true";
        }

        button.labelView.setTemplate({
          tag: "fa-icon",
          attributes,
        });
      }

      button.bind("isEnabled").to(command, "isEnabled");

      this.listenTo(button, "execute", () => {
        this.editor.execute("insertBbcode", name);
      });

      return button;
    });
  }
}

export default WoltlabBbcode;

type WoltlabBbcodeButton = {
  icon?: string;
  name: string;
  label: string;
};

export type WoltlabBbcodeConfig = WoltlabBbcodeButton[];

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabBbcode?: WoltlabBbcodeConfig;
  }
}
