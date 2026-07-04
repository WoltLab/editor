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
  ClipboardInputTransformationEvent,
  ClipboardObserver,
  ClipboardPipeline,
} from "@ckeditor/ckeditor5-clipboard";
import {
  Model,
  ModelDocumentFragment,
  ViewDocumentFragment,
  ViewElement,
  ViewUpcastWriter,
} from "@ckeditor/ckeditor5-engine";

const INHERITED_TEXT_COLOR_VARIABLE = "--wcfContentText";
const COLOR_STYLE = "color";

export class WoltlabPasteFromOffice extends Plugin {
  #colorNormalizer?: CanvasRenderingContext2D | null;

  static get pluginName() {
    return "WoltlabPasteFromOffice";
  }

  init() {
    this.editor.editing.view.addObserver(ClipboardObserver);

    this.editor.plugins
      .get(ClipboardPipeline)
      .on<ClipboardInputTransformationEvent>(
        "inputTransformation",
        (event, data) => {
          this.#removeInheritedTextColor(data.content);
        },
        { priority: "high" },
      );

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
    const range = model.createRangeIn(documentFragment);
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

  #removeInheritedTextColor(documentFragment: ViewDocumentFragment): void {
    const colors = this.#getInheritedTextColors();
    if (colors.size === 0) {
      return;
    }

    const writer = new ViewUpcastWriter(documentFragment.document);
    const range = writer.createRangeIn(documentFragment);
    const elements = Array.from(range.getItems()).filter(
      (item): item is ViewElement => item.is("element"),
    );

    for (const element of elements) {
      const color = element.getStyle(COLOR_STYLE);
      if (color === undefined) {
        continue;
      }

      const normalizedColor = this.#normalizeColor(color);
      if (normalizedColor !== undefined && colors.has(normalizedColor)) {
        writer.removeStyle(COLOR_STYLE, element);
      }
    }
  }

  #getInheritedTextColors(): Set<string> {
    const colors = new Set<string>();
    const editableElement = this.editor.ui.getEditableElement();

    if (editableElement !== null) {
      this.#addComputedTextColors(colors, editableElement);
    }

    if (document.body !== null) {
      this.#addComputedTextColors(colors, document.body);
    }

    this.#addComputedTextColors(colors, document.documentElement);
    this.#addStyleSheetTextColors(colors);

    return colors;
  }

  #addComputedTextColors(colors: Set<string>, element: HTMLElement): void {
    const style = getComputedStyle(element);

    this.#addColor(colors, style.color);
    this.#addColor(
      colors,
      style.getPropertyValue(INHERITED_TEXT_COLOR_VARIABLE),
    );
  }

  #addStyleSheetTextColors(colors: Set<string>): void {
    for (const styleSheet of Array.from(document.styleSheets)) {
      let cssRules: CSSRuleList;

      try {
        cssRules = styleSheet.cssRules;
      } catch {
        continue;
      }

      this.#addStyleSheetRuleTextColors(colors, cssRules);
    }
  }

  #addStyleSheetRuleTextColors(
    colors: Set<string>,
    cssRules: CSSRuleList,
  ): void {
    for (const rule of Array.from(cssRules)) {
      if ("style" in rule) {
        this.#addColor(
          colors,
          (
            rule as CSSRule & { style: CSSStyleDeclaration }
          ).style.getPropertyValue(INHERITED_TEXT_COLOR_VARIABLE),
        );
      }

      if ("cssRules" in rule) {
        this.#addStyleSheetRuleTextColors(
          colors,
          (rule as CSSRule & { cssRules: CSSRuleList }).cssRules,
        );
      }
    }
  }

  #addColor(colors: Set<string>, color: string): void {
    const normalizedColor = this.#normalizeColor(color);

    if (normalizedColor !== undefined) {
      colors.add(normalizedColor);
    }
  }

  #normalizeColor(color: string): string | undefined {
    const trimmedColor = color.trim();
    if (trimmedColor === "" || trimmedColor.includes("var(")) {
      return undefined;
    }

    const context = this.#getColorNormalizer();
    if (context !== null) {
      context.fillStyle = "#000001";
      context.fillStyle = trimmedColor;

      const normalizedColor = context.fillStyle.toLowerCase();
      if (
        normalizedColor !== "#000001" ||
        trimmedColor.replace(/\s/g, "").toLowerCase() === "rgb(0,0,1)"
      ) {
        return normalizedColor;
      }
    }

    return trimmedColor
      .replace(/\s/g, "")
      .replace(/^rgba\((\d+),(\d+),(\d+),(?:1|1\.0)\)$/i, "rgb($1,$2,$3)")
      .toLowerCase();
  }

  #getColorNormalizer(): CanvasRenderingContext2D | null {
    if (this.#colorNormalizer !== undefined) {
      return this.#colorNormalizer;
    }

    this.#colorNormalizer = document.createElement("canvas").getContext("2d");

    return this.#colorNormalizer;
  }
}

export default WoltlabPasteFromOffice;
