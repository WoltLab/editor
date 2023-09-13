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
  ImageResizeEditing,
  ImageResizeHandles,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageUploadUI,
} from "@ckeditor/ckeditor5-image";
import { Indent } from "@ckeditor/ckeditor5-indent";
import { AutoLink, Link, LinkImage } from "@ckeditor/ckeditor5-link";
import { List } from "@ckeditor/ckeditor5-list";
import { Mention } from "@ckeditor/ckeditor5-mention";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import { PasteFromOffice } from "@ckeditor/ckeditor5-paste-from-office";
import { RemoveFormat } from "@ckeditor/ckeditor5-remove-format";
import { Table, TableToolbar } from "@ckeditor/ckeditor5-table";
import { Undo } from "@ckeditor/ckeditor5-undo";
import * as WoltlabAttachment from "./plugins/ckeditor5-woltlab-attachment";
import * as WoltlabAutosave from "./plugins/ckeditor5-woltlab-autosave";
import * as WoltlabBbcode from "./plugins/ckeditor5-woltlab-bbcode";
import * as WoltlabBlockQuote from "./plugins/ckeditor5-woltlab-block-quote";
import * as WoltlabCode from "./plugins/ckeditor5-woltlab-code";
import * as WoltlabCodeBlock from "./plugins/ckeditor5-woltlab-code-block";
import * as WoltlabHtmlEmbed from "./plugins/ckeditor5-woltlab-html-embed";
import * as WoltlabImage from "./plugins/ckeditor5-woltlab-image";
import * as WoltlabMagicParagraph from "./plugins/ckeditor5-woltlab-magic-paragraph";
import * as WoltlabMedia from "./plugins/ckeditor5-woltlab-media";
import * as WoltlabMention from "./plugins/ckeditor5-woltlab-mention";
import * as WoltlabMetacode from "./plugins/ckeditor5-woltlab-metacode";
import * as WoltlabSmiley from "./plugins/ckeditor5-woltlab-smiley";
import * as WoltlabSpoiler from "./plugins/ckeditor5-woltlab-spoiler";
import * as WoltlabToolbarGroup from "./plugins/ckeditor5-woltlab-toolbar-group";
import * as WoltlabUpload from "./plugins/ckeditor5-woltlab-upload";

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
    ImageResizeEditing,
    ImageResizeHandles,
    ImageStyle,
    ImageUpload,
    ImageUploadUI,
    Link,
    LinkImage,
    List,
    Table,
    TableToolbar,

    // WoltLab
    WoltlabAttachment.WoltlabAttachment,
    WoltlabAutosave.WoltlabAutosave,
    WoltlabBlockQuote.WoltlabBlockQuote,
    WoltlabBbcode.WoltlabBbcode,
    WoltlabCode.WoltlabCode,
    WoltlabCodeBlock.WoltlabCodeBlock,
    WoltlabHtmlEmbed.WoltlabHtmlEmbed,
    WoltlabImage.WoltlabImage,
    WoltlabMagicParagraph.WoltlabMagicParagraph,
    WoltlabMedia.WoltlabMedia,
    WoltlabMention.WoltlabMention,
    WoltlabMetacode.WoltlabMetacode,
    WoltlabSmiley.WoltlabSmiley,
    WoltlabSpoiler.WoltlabSpoiler,
    WoltlabToolbarGroup.WoltlabToolbarGroup,
    WoltlabUpload.WoltlabUpload,
  ],
};

export async function create(
  element: HTMLElement,
  configuration: EditorConfig,
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
      resizeUnit: "px",
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

  // Unconditionally disable the `AutoLink` plugin which interferes with our
  // own link detection and all creates potentially invalid links.
  // See https://github.com/ckeditor/ckeditor5/issues/14497
  const autoLink = editor.plugins.get(AutoLink);
  autoLink?.forceDisabled("app.ts");

  return editor;
}

//export CKEditor5;
export * as Alignment from "@ckeditor/ckeditor5-alignment";
export * as Autosave from "@ckeditor/ckeditor5-autosave";
export * as BasicStyles from "@ckeditor/ckeditor5-basic-styles";
export * as BlockQuote from "@ckeditor/ckeditor5-block-quote";
export * as Clipboard from "@ckeditor/ckeditor5-clipboard";
export * as CodeBlock from "@ckeditor/ckeditor5-code-block";
export * as Core from "@ckeditor/ckeditor5-core";
export * as Editor from "@ckeditor/ckeditor5-editor-classic";
export * as Enter from "@ckeditor/ckeditor5-enter";
export * as Essentials from "@ckeditor/ckeditor5-essentials";
export * as Font from "@ckeditor/ckeditor5-font";
export * as Heading from "@ckeditor/ckeditor5-heading";
export * as Highlight from "@ckeditor/ckeditor5-highlight";
export * as horizontalLine from "@ckeditor/ckeditor5-horizontal-line";
export * as HtmlEmbed from "@ckeditor/ckeditor5-html-embed";
export * as Image from "@ckeditor/ckeditor5-image";
export * as Indent from "@ckeditor/ckeditor5-indent";
export * as Link from "@ckeditor/ckeditor5-link";
export * as List from "@ckeditor/ckeditor5-list";
export * as Mention from "@ckeditor/ckeditor5-mention";
export * as Paragraph from "@ckeditor/ckeditor5-paragraph";
export * as PasteFromOffice from "@ckeditor/ckeditor5-paste-from-office";
export * as RemoveFormat from "@ckeditor/ckeditor5-remove-format";
export * as SelectAll from "@ckeditor/ckeditor5-select-all";
export * as Table from "@ckeditor/ckeditor5-table";
export * as Typing from "@ckeditor/ckeditor5-typing";
export * as Ui from "@ckeditor/ckeditor5-ui";
export * as Undo from "@ckeditor/ckeditor5-undo";
export * as Upload from "@ckeditor/ckeditor5-upload";
export * as Utils from "@ckeditor/ckeditor5-utils";
export * as Widget from "@ckeditor/ckeditor5-widget";

//export Woltlab CkEditor Plugins
export const Plugins = {
    WoltlabAttachment : WoltlabAttachment,
    WoltlabAutosave: WoltlabAutosave,
    WoltlabBbcode: WoltlabBbcode,
    WoltlabBlockQuote: WoltlabBlockQuote,
    WoltlabCode: WoltlabCode,
    WoltlabCodeBlock: WoltlabCodeBlock,
    WoltlabHtmlEmbed: WoltlabHtmlEmbed,
    WoltlabImage: WoltlabImage,
    WoltlabMagicParagraph: WoltlabMagicParagraph,
    WoltlabMedia: WoltlabMedia,
    WoltlabMention: WoltlabMention,
    WoltlabMetacode: WoltlabMetacode,
    WoltlabSmiley: WoltlabSmiley,
    WoltlabSpoiler: WoltlabSpoiler,
    WoltlabToolbarGroup: WoltlabToolbarGroup,
    WoltlabUpload: WoltlabUpload
}