/**
 * HTMLPurifier is unable to properly handle percentage based widths on both
 * `<img>` and `<figure>`: https://github.com/ezyang/htmlpurifier/issues/151
 *
 * This plugin will mirror the width attribute onto a special data attribute
 * that is recognized on the server.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Command, Plugin } from "@ckeditor/ckeditor5-core";
import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import type {
  DowncastAttributeEvent,
  DowncastConversionApi,
  DowncastInsertEvent,
  ModelDocumentSelection,
  ModelElement,
  ModelItem,
  ModelSelection,
} from "@ckeditor/ckeditor5-engine";
import { ImageUtils } from "@ckeditor/ckeditor5-image";
import { ObservableSetEvent } from "@ckeditor/ckeditor5-utils";

export class WoltlabImage extends Plugin {
  static get pluginName() {
    return "WoltlabImage";
  }

  static get requires() {
    return [ImageUtils] as const;
  }

  #maximumHeight: number | undefined = undefined;

  init() {
    const classicEditor = this.editor.ui.editor;
    if (!(classicEditor instanceof ClassicEditor)) {
      throw new Error("The editor instance is not a `ClassicEditor`.");
    }

    this.#maximumHeight = this.#calculateMaximumHeight(
      classicEditor.sourceElement,
    );

    this.#decorateCommand(this.editor.commands.get("uploadImage")!);
    this.#decorateCommand(this.editor.commands.get("insertImage")!);
    this.#decorateCommand(this.editor.commands.get("replaceImageSource")!);

    const { conversion } = this.editor;

    const imageTypes = ["imageBlock", "imageInline"] as const;
    const imageUtils = this.editor.plugins.get("ImageUtils");

    for (const imageType of imageTypes) {
      conversion.for("dataDowncast").attributeToAttribute({
        model: {
          name: imageType,
          key: "data-width",
        },
        view: "data-width",
      });
      conversion.for("upcast").attributeToAttribute({
        view: {
          name: imageType === "imageBlock" ? "figure" : "img",
          key: "data-width",
        },
        model: "data-width",
      });

      conversion.for("dataDowncast").add((dispatcher) => {
        dispatcher.on<DowncastAttributeEvent>(
          `attribute:resizedWidth:${imageType}`,
          (_evt, data, conversionApi) => {
            this.#setResizeWidth(
              data.item,
              data.attributeNewValue,
              conversionApi,
            );
          },
          { priority: "lowest" },
        );
      });

      conversion.for("editingDowncast").add((dispatcher) => {
        dispatcher.on<DowncastInsertEvent>(
          `insert:${imageType}`,
          (_evt, { item }, conversionApi) => {
            const { mapper } = conversionApi;
            const { domConverter } = this.editor.editing.view;

            const container = mapper.toViewElement(item as ModelElement);
            if (
              !container ||
              !container.is("containerElement") ||
              container.childCount !== 1
            ) {
              return;
            }

            const viewElement = container.getChild(0)!;
            if (!viewElement.is("element")) {
              return;
            }

            const img = domConverter.viewToDom(
              imageUtils.findViewImgElement(viewElement)!,
            );
            if (!(img instanceof HTMLImageElement)) {
              return;
            }

            const setMaxWidth = () => {
              let maxWidth = img.naturalWidth;
              if (this.#maximumHeight !== undefined) {
                const aspectRatio = maxWidth / img.naturalHeight;
                maxWidth = Math.round(aspectRatio * this.#maximumHeight);
              }

              this.editor.editing.view.change((writer) => {
                writer.setStyle("max-width", `${maxWidth}px`, container);
              });
            };

            if (img.complete && img.naturalHeight !== 0) {
              setMaxWidth();
            } else {
              img.addEventListener("load", () => setMaxWidth(), { once: true });
            }
          },
        );

        dispatcher.on<DowncastAttributeEvent>(
          `attribute:resizedWidth:${imageType}`,
          (_evt, data, conversionApi) => {
            this.#setResizeWidth(
              data.item,
              data.attributeNewValue,
              conversionApi,
            );
          },
          { priority: "lowest" },
        );
      });
    }
  }

  #setResizeWidth(
    item: ModelItem | ModelSelection | ModelDocumentSelection,
    width: unknown,
    conversionApi: DowncastConversionApi,
  ) {
    if (!item.is("element")) {
      return;
    }
    if (typeof width !== "string") {
      return;
    }

    const { mapper, writer } = conversionApi;

    const viewElement = mapper.toViewElement(item);
    if (viewElement === undefined) {
      return;
    }
    const imageUtils = this.editor.plugins.get("ImageUtils");

    writer.setAttribute(
      "data-width",
      width,
      imageUtils.findViewImgElement(viewElement)!,
    );
  }

  #decorateCommand(command: Command | undefined) {
    const imageUtils: ImageUtils = this.editor.plugins.get("ImageUtils");
    command?.on<ObservableSetEvent<boolean>>(
      "set:isEnabled",
      (evt, _, value) => {
        if (!value) {
          return;
        }
        const selection = this.editor.model.document.selection;
        const element = imageUtils.getClosestSelectedImageElement(selection);
        if (!element) {
          return;
        }
        evt.return = !(this.#isAttachment(element) || this.#isMedia(element));
      },
      { priority: "high" },
    );
  }

  #isAttachment(element: ModelElement): boolean {
    return (
      element.getAttribute("classList") === "woltlabAttachment" ||
      element.hasAttribute("attachmentId")
    );
  }

  #isMedia(element: ModelElement): boolean {
    return (
      element.getAttribute("classList") === "woltlabSuiteMedia" ||
      element.hasAttribute("mediaId")
    );
  }

  /**
   * Calculates the maximum height that images can take up in the current editor
   * location. This is useful for areas that restrict the height, for example,
   * in the signature.
   */
  #calculateMaximumHeight(
    element: HTMLElement | undefined,
  ): number | undefined {
    if (element === undefined) {
      throw new Error("Cannot access the editor’s source DOM element.");
    }

    const img = document.createElement("img");
    // 1x1 pixel transparent PNG
    img.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    // Hide and position the image absolutely to prevent layout shifts.
    img.style.setProperty("position", "absolute", "important");
    img.style.setProperty("visibility", "hidden", "important");

    element.insertAdjacentElement("beforebegin", img);

    const maxHeight = window.getComputedStyle(img).maxHeight;
    if (!maxHeight.endsWith("px")) {
      return undefined;
    }

    return parseInt(maxHeight);
  }
}

export default WoltlabImage;
