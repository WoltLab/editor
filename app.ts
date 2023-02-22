/**
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

// app.js

import { Alignment } from "@ckeditor/ckeditor5-alignment";
import { Autosave } from "@ckeditor/ckeditor5-autosave";
import {
  Bold,
  Code,
  Italic,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
} from "@ckeditor/ckeditor5-basic-styles";
import { BlockQuote } from "@ckeditor/ckeditor5-block-quote";
import { CodeBlock } from "@ckeditor/ckeditor5-code-block";
import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import { Essentials } from "@ckeditor/ckeditor5-essentials";
import { Heading } from "@ckeditor/ckeditor5-heading";
import { HtmlEmbed } from "@ckeditor/ckeditor5-html-embed";
import {
  Image,
  ImageInsertUI,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageUploadUI,
} from "@ckeditor/ckeditor5-image";
import { Indent } from "@ckeditor/ckeditor5-indent";
import * as CKEditorInspector from "@ckeditor/ckeditor5-inspector";
import { Link, LinkImage } from "@ckeditor/ckeditor5-link";
import { List } from "@ckeditor/ckeditor5-list";
import { Mention } from "@ckeditor/ckeditor5-mention";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import { PasteFromOffice } from "@ckeditor/ckeditor5-paste-from-office";
import { Table, TableToolbar } from "@ckeditor/ckeditor5-table";
import { WoltlabAttachment } from "./plugins/ckeditor5-woltlab-attachment";
import { WoltlabBbcode } from "./plugins/ckeditor5-woltlab-bbcode";
import { WoltlabBlockQuote } from "./plugins/ckeditor5-woltlab-block-quote";
import { WoltlabCodeBlock } from "./plugins/ckeditor5-woltlab-code-block";
import { WoltlabMedia } from "./plugins/ckeditor5-woltlab-media";
import { WoltlabMetacode } from "./plugins/ckeditor5-woltlab-metacode";
import { WoltlabSmiley } from "./plugins/ckeditor5-woltlab-smiley";
import { WoltlabSpoiler } from "./plugins/ckeditor5-woltlab-spoiler";
import { WoltlabToolbarGroup } from "./plugins/ckeditor5-woltlab-toolbar-group";
import { WoltlabUpload } from "./plugins/ckeditor5-woltlab-upload";

import type { EditorConfig } from "@ckeditor/ckeditor5-core/src/editor/editorconfig";

const defaultConfig: EditorConfig = {
  plugins: [
    // Internals
    Autosave,
    Essentials,
    Indent,
    Mention,
    Paragraph,
    PasteFromOffice,

    // Formatting
    Alignment,
    Bold,
    Code,
    Heading,
    Italic,
    Strikethrough,
    Subscript,
    Superscript,
    Underline,

    // Components
    BlockQuote,
    CodeBlock,
    HtmlEmbed,
    Image,
    ImageInsertUI,
    ImageToolbar,
    ImageStyle,
    ImageUpload,
    ImageUploadUI,
    Link,
    LinkImage,
    List,
    Table,
    TableToolbar,

    // WoltLab
    WoltlabAttachment,
    WoltlabBlockQuote,
    WoltlabBbcode,
    WoltlabCodeBlock,
    WoltlabMedia,
    WoltlabMetacode,
    WoltlabSmiley,
    WoltlabSpoiler,
    WoltlabToolbarGroup,
    WoltlabUpload,
  ],
};

export async function create(
  element: HTMLElement,
  configuration: EditorConfig,
  enableDebug: boolean
): Promise<ClassicEditor> {
  configuration = Object.assign(configuration, defaultConfig);

  const removePlugins = configuration.removePlugins || [];
  if (!removePlugins.includes("Image")) {
    configuration.image = {
      insert: {
        type: "inline",
      },
      toolbar: ["imageStyle:inline", "imageStyle:block", "imageStyle:side"],
    };

    if (!removePlugins.includes("Link")) {
      configuration.image.toolbar!.push("|", "linkImage");
    }
  }

  if (!removePlugins.includes("Table")) {
    configuration.table = {
      contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
    };
  }

  const editor = await ClassicEditor.create(element, configuration);

  if (enableDebug) {
    CKEditorInspector.attach(editor);
  }

  return editor;
}
