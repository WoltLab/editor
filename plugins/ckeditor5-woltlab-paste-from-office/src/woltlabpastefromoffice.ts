/**
 * Intercepts and sanitizes HTML paste from text processors.
 *
 * @author Alexander Ebert
 * @copyright 2001-2025 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.1
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import {
  ClipboardContentInsertionEvent,
  ClipboardObserver,
  ClipboardPipeline,
} from "@ckeditor/ckeditor5-clipboard";
import { Model, ModelDocumentFragment } from "@ckeditor/ckeditor5-engine";

export class WoltlabPasteFromOffice extends Plugin {
  static get pluginName() {
    return "WoltlabPasteFromOffice";
  }

  init() {
    this.editor.editing.view.addObserver(ClipboardObserver);

    this.editor.plugins
      .get(ClipboardPipeline)
      .on<ClipboardContentInsertionEvent>("contentInsertion", (event, data) => {
        if (this.#isPastedFromExcel(data.content, this.editor.model)) {
          this.#removeLeadingCssBlock(data.content, this.editor.model);
        }
      });
  }

  /**
   * Pasting from the web version of Excel can sometimes prepend a block of CSS
   * in front of the table. This block is added as a plain text paragraph that
   * needs to be removed.
   * 
   * This can be easily detected by checking if a paragraph followed by a table
   * is pasted and the paragraph contains certain strings that are unique to
   * MS office.
   */
  #isPastedFromExcel(
    documentFragment: ModelDocumentFragment,
    model: Model,
  ): boolean {
    let range = model.createRangeIn(documentFragment);
    if (documentFragment.childCount !== 2) {
      return false;
    }

    const elements = Array.from(range.getItems());

    const firstChild = elements[0];
    if (!firstChild.is("element") || firstChild.name !== "paragraph") {
      return false;
    }

    if (firstChild.childCount !== 1) {
      return false;
    }

    const firstNode = Array.from(firstChild.getChildren())[0];
    if (!firstNode.is("$text")) {
      return false;
    }

    const content = firstNode.data;
    const isCss =
      content.startsWith("table {") &&
      content.endsWith("}") &&
      content.includes("mso-");
    if (!isCss) {
      return false;
    }

    const isFollowedByTable =
      elements[2].is("element") && elements[2].name === "table";

    return isFollowedByTable;
  }

  #removeLeadingCssBlock(
    documentFragment: ModelDocumentFragment,
    model: Model,
  ): void {
    model.change((writer) => {
      const range = writer.createRangeIn(documentFragment);
      const items = Array.from(range.getItems());
      writer.remove(items[0]);
    });
  }
}

export default WoltlabPasteFromOffice;
