/**
 * Removes text-color styles that only reproduce the editor's default text color.
 *
 * @author Sascha Greuel
 * @copyright 2026 SoftCreatR Media
 * @license LGPL-2.1-or-later
 * @since 6.2
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import {
  ClipboardInputTransformationEvent,
  ClipboardPipeline,
} from "@ckeditor/ckeditor5-clipboard";
import {
  ViewDocumentFragment,
  ViewElement,
  ViewUpcastWriter,
} from "@ckeditor/ckeditor5-engine";

const COLOR_STYLE = "color";
const DEFAULT_TEXT_COLOR_VARIABLE = "--wcfContentText";

export class WoltlabPasteTextColor extends Plugin {
  #colorNormalizer?: CanvasRenderingContext2D | null;
  readonly #defaultTextColors = new Set<string>();
  #colorSchemeObserver?: MutationObserver;

  static get pluginName() {
    return "WoltlabPasteTextColor";
  }

  init(): void {
    this.editor.plugins
      .get(ClipboardPipeline)
      .on<ClipboardInputTransformationEvent>(
        "inputTransformation",
        (event, data) => {
          this.#removeDefaultTextColors(data.content);
        },
        { priority: "high" },
      );
  }

  afterInit(): void {
    // Reading computed styles once keeps pastes independent of stylesheet size.
    this.#rememberEditorTextColors();

    this.#colorSchemeObserver = new MutationObserver(() => {
      // Keep the colors for both schemes; clipboard content may come from a
      // tab that has not switched schemes yet.
      this.#rememberEditorTextColors();
    });
    this.#colorSchemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-color-scheme"],
    });
  }

  destroy(): void {
    this.#colorSchemeObserver?.disconnect();

    super.destroy();
  }

  #removeDefaultTextColors(documentFragment: ViewDocumentFragment): void {
    if (this.#defaultTextColors.size === 0) {
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
      if (
        normalizedColor !== undefined &&
        this.#defaultTextColors.has(normalizedColor) &&
        !this.#hasAncestorWithDifferentTextColor(element, normalizedColor)
      ) {
        writer.removeStyle(COLOR_STYLE, element);
      }
    }
  }

  #hasAncestorWithDifferentTextColor(
    element: ViewElement,
    color: string,
  ): boolean {
    let parent = element.parent;

    while (parent !== null) {
      if (parent.is("element")) {
        const parentColor = parent.getStyle(COLOR_STYLE);
        if (parentColor !== undefined) {
          const normalizedParentColor = this.#normalizeColor(parentColor);

          // An explicit parent color changes what the child would inherit.
          // Preserve the child style unless the two colors are identical.
          if (
            normalizedParentColor === undefined ||
            normalizedParentColor !== color
          ) {
            return true;
          }
        }
      }

      parent = parent.parent;
    }

    return false;
  }

  #rememberEditorTextColors(): void {
    const editableElement = this.editor.ui.getEditableElement();
    if (editableElement === null) {
      return;
    }

    const style = getComputedStyle(editableElement);
    this.#addDefaultTextColor(style.color);
    this.#addDefaultTextColor(
      style.getPropertyValue(DEFAULT_TEXT_COLOR_VARIABLE),
    );
  }

  #addDefaultTextColor(color: string): void {
    const normalizedColor = this.#normalizeColor(color);
    if (normalizedColor !== undefined) {
      // Keep colors from previous schemes because the clipboard can originate
      // from another tab that has not switched schemes yet.
      this.#defaultTextColors.add(normalizedColor);
    }
  }

  #normalizeColor(color: string): string | undefined {
    const trimmedColor = color.trim();
    if (trimmedColor === "" || trimmedColor.includes("var(")) {
      return undefined;
    }

    const context = this.#getColorNormalizer();
    if (context !== null) {
      // Canvas returns the previous value for an unsupported color. A sentinel
      // makes that case distinguishable from a valid black value.
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

export default WoltlabPasteTextColor;
