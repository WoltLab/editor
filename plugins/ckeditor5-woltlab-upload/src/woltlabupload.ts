/**
 * Intercepts files being dropped into the editor and forwards the upload
 * request to configurable backends.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Plugin } from "@ckeditor/ckeditor5-core";
import { FileRepository } from "@ckeditor/ckeditor5-upload";
import {
  WoltlabUploadAdapter,
  WoltlabUploadResult,
} from "./woltlabuploadadapter";

import type { FileLoader } from "@ckeditor/ckeditor5-upload/src/filerepository";

type ClipboardInputEventData = {
  dataTransfer: DataTransfer;
  method: string;
};

export class WoltlabUpload extends Plugin {
  static get pluginName() {
    return "WoltlabUpload";
  }

  static get requires() {
    return [FileRepository];
  }

  override init() {
    const { config, editing, plugins } = this.editor;

    const options = config.get("woltlabUpload") as WoltlabUploadConfig;

    if (!options || typeof options.uploadImage !== "function") {
      return;
    }

    // CKEditor does not come with an upload adapter, therefore
    // we need to register our own that offloads the uploads
    // to our own API through a callback in the editor config.
    plugins.get(FileRepository).createUploadAdapter = (loader: FileLoader) => {
      return new WoltlabUploadAdapter(loader, options);
    };

    if (typeof options.uploadOther !== "function") {
      return;
    }

    this.listenTo(
      editing.view.document,
      "clipboardInput",
      (event, data: ClipboardInputEventData) => {
        if (event.stop.called) {
          return;
        }

        const { dataTransfer, method } = data;
        if (method !== "drop") {
          return;
        }

        for (const file of dataTransfer.files) {
          if (file !== null) {
            options.uploadOther(file);
          }
        }

        event.stop();
      },
      { priority: "lowest" }
    );
  }
}

export default WoltlabUpload;

export type WoltlabUploadConfig = {
  uploadImage(
    file: File,
    abortController: AbortController
  ): Promise<WoltlabUploadResult>;

  uploadOther(file: File): void;
};

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabUpload?: WoltlabUploadConfig;
  }
}
