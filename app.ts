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
import { icons } from "@ckeditor/ckeditor5-core";
import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import { Essentials } from "@ckeditor/ckeditor5-essentials";
import { FontColor, FontFamily, FontSize } from "@ckeditor/ckeditor5-font";
import { Heading } from "@ckeditor/ckeditor5-heading";
import { Highlight } from "@ckeditor/ckeditor5-highlight";
import { HtmlEmbed } from "@ckeditor/ckeditor5-html-embed";
import { HorizontalLine } from "@ckeditor/ckeditor5-horizontal-line";
import {
  Image,
  ImageInsertUI,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageUploadUI,
} from "@ckeditor/ckeditor5-image";
import { Indent } from "@ckeditor/ckeditor5-indent";
import { Link, LinkImage } from "@ckeditor/ckeditor5-link";
import { List } from "@ckeditor/ckeditor5-list";
import { Mention } from "@ckeditor/ckeditor5-mention";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import { PasteFromOffice } from "@ckeditor/ckeditor5-paste-from-office";
import { RemoveFormat } from "@ckeditor/ckeditor5-remove-format";
import { Table, TableToolbar } from "@ckeditor/ckeditor5-table";
import { Undo } from "@ckeditor/ckeditor5-undo";
import { WoltlabAttachment } from "./plugins/ckeditor5-woltlab-attachment";
import { WoltlabAutosave } from "./plugins/ckeditor5-woltlab-autosave";
import { WoltlabBbcode } from "./plugins/ckeditor5-woltlab-bbcode";
import { WoltlabBlockQuote } from "./plugins/ckeditor5-woltlab-block-quote";
import { WoltlabCode } from "./plugins/ckeditor5-woltlab-code";
import { WoltlabCodeBlock } from "./plugins/ckeditor5-woltlab-code-block";
import { WoltlabMedia } from "./plugins/ckeditor5-woltlab-media";
import { WoltlabMention } from "./plugins/ckeditor5-woltlab-mention";
import { WoltlabMetacode } from "./plugins/ckeditor5-woltlab-metacode";
import { WoltlabSmiley } from "./plugins/ckeditor5-woltlab-smiley";
import { WoltlabSpoiler } from "./plugins/ckeditor5-woltlab-spoiler";
import { WoltlabToolbarGroup } from "./plugins/ckeditor5-woltlab-toolbar-group";
import { WoltlabUpload } from "./plugins/ckeditor5-woltlab-upload";

import type { EditorConfig } from "@ckeditor/ckeditor5-core";

const defaultConfig: EditorConfig = {
  plugins: [
    // Internals
    Autosave,
    Essentials,
    Indent,
    Mention,
    Paragraph,
    PasteFromOffice,
    Undo,

    // Formatting
    Alignment,
    Bold,
    Code,
    FontColor,
    FontFamily,
    FontSize,
    Heading,
    Highlight,
    Italic,
    RemoveFormat,
    Strikethrough,
    Subscript,
    Superscript,
    Underline,

    // Components
    BlockQuote,
    CodeBlock,
    HtmlEmbed,
    HorizontalLine,
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
    WoltlabAutosave,
    WoltlabBlockQuote,
    WoltlabBbcode,
    WoltlabCode,
    WoltlabCodeBlock,
    WoltlabMedia,
    WoltlabMention,
    WoltlabMetacode,
    WoltlabSmiley,
    WoltlabSpoiler,
    WoltlabToolbarGroup,
    WoltlabUpload,
  ],
};

export async function create(
  element: HTMLElement,
  configuration: EditorConfig
): Promise<ClassicEditor> {
  configuration = Object.assign(configuration, defaultConfig);

  const removePlugins = configuration.removePlugins || [];
  if (!removePlugins.includes("Image")) {
    configuration.image = {
      insert: {
        integrations: ["insertImageViaUrl"],
        type: "inline",
      },
      toolbar: [
        "imageStyle:inline",
        "imageStyle:sideLeft",
        "imageStyle:block",
        "imageStyle:side",
      ],
      styles: {
        options: [
          "inline",
          {
            name: "sideLeft",
            title: "Left aligned image",
            icon: icons.objectLeft,
            modelElements: ["imageBlock"],
            className: "image-style-side-left",
          },
          "block",
          "side",
        ],
      },
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

  return editor;
}
