/**
 * Provides an upload adapter for images.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import type { FileLoader, UploadAdapter } from "@ckeditor/ckeditor5-upload";
import type { WoltlabUploadConfig } from "./woltlabupload";

export class WoltlabUploadAdapter implements UploadAdapter {
  readonly #loader: FileLoader;
  readonly #options: WoltlabUploadConfig;
  #signal?: AbortController;

  constructor(loader: FileLoader, options: WoltlabUploadConfig) {
    this.#loader = loader;
    this.#options = options;
  }

  abort(): void {
    this.#signal?.abort();
  }

  // The typings are outdated and do not reflect the
  // correct return type that permits custom properties
  // to be returned.
  async upload() {
    const file = (await this.#loader.file) as File;

    this.#signal = new AbortController();
    const result = this.#options.uploadImage(file, this.#signal);

    return result as unknown as Record<string, string>;
  }
}

export default WoltlabUploadAdapter;

export type WoltlabUploadResult = {
  [key: string]: unknown;
  urls: {
    default: string;
  };
};
