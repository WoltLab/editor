/**
 * Uploads files dropped onto the editor as an attachment.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { HtmlEmbed } from "@ckeditor/ckeditor5-html-embed";

export class WoltlabHtmlEmbed extends Plugin {
  static get pluginName() {
    return "WoltlabHtmlEmbed";
  }

  static get requires() {
    return [HtmlEmbed] as const;
  }

  init() {
    const { conversion, data } = this.editor;

    // The following code has been liberated from `ckeditor5/html-embed/src/htmlembedediting.ts`.

    // Register pre.woltlabHtml as a raw content element so all of it's content will be provided
    // as a view element's custom property while data upcasting.
    data.registerRawContentMatcher({
      name: "pre",
      classes: "woltlabHtml",
    });

    conversion.for("upcast").elementToElement({
      view: {
        name: "pre",
        classes: "woltlabHtml",
      },
      model: (viewElement, { writer }) => {
        let value = viewElement.getCustomProperty("$rawContent");
        if (typeof value === "string") {
          // The previous implementation of raw HTML applies an encoding to all
          // HTML entities to prevent them being mangled by HTMLPurifier.
          value = this.#unescapeHTML(value);
        } else {
          value = "";
        }

        // The pre.woltlabHtml is registered as a raw content element,
        // so all it's content is available in a custom property.
        return writer.createElement("rawHtml", {
          value,
        });
      },
      converterPriority: "high",
    });

    conversion.for("dataDowncast").elementToElement({
      model: "rawHtml",
      view: (modelElement, { writer }) => {
        return writer.createRawElement(
          "pre",
          { class: "woltlabHtml" },
          function (domElement) {
            domElement.textContent =
              (modelElement.getAttribute("value") as string) || "";
          },
        );
      },
      converterPriority: "high",
    });
  }

  #unescapeHTML(string: string): string {
    return String(string)
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }
}

export default WoltlabHtmlEmbed;
