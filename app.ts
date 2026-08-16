/**
 * @author Alexander Ebert
 * @copyright 2001-2026 WoltLab GmbH
 * @license LGPL-2.1-or-later
 */

// These are the core styles of CKEditor5 that must be imported first and in
// this exact order.
import "@ckeditor/ckeditor5-ui/dist/index.css";
import "@ckeditor/ckeditor5-clipboard/dist/index.css";
import "@ckeditor/ckeditor5-core/dist/index.css";
import "@ckeditor/ckeditor5-engine/dist/index.css";
import "@ckeditor/ckeditor5-enter/dist/index.css";
import "@ckeditor/ckeditor5-paragraph/dist/index.css";
import "@ckeditor/ckeditor5-select-all/dist/index.css";
import "@ckeditor/ckeditor5-typing/dist/index.css";
import "@ckeditor/ckeditor5-undo/dist/index.css";
import "@ckeditor/ckeditor5-upload/dist/index.css";
import "@ckeditor/ckeditor5-utils/dist/index.css";
import "@ckeditor/ckeditor5-watchdog/dist/index.css";
import "@ckeditor/ckeditor5-widget/dist/index.css";

// CSS of plugins of CKEditor come first to allow us to customize them with out
// own plugins that are imported through the `modules.ts`.
import "@ckeditor/ckeditor5-alignment/dist/index.css";
import "@ckeditor/ckeditor5-autoformat/dist/index.css";
import "@ckeditor/ckeditor5-autosave/dist/index.css";
import "@ckeditor/ckeditor5-basic-styles/dist/index.css";
import "@ckeditor/ckeditor5-block-quote/dist/index.css";
import "@ckeditor/ckeditor5-code-block/dist/index.css";
import "@ckeditor/ckeditor5-editor-classic/dist/index.css";
import "@ckeditor/ckeditor5-emoji/dist/index.css";
import "@ckeditor/ckeditor5-essentials/dist/index.css";
import "@ckeditor/ckeditor5-font/dist/index.css";
import "@ckeditor/ckeditor5-heading/dist/index.css";
import "@ckeditor/ckeditor5-highlight/dist/index.css";
import "@ckeditor/ckeditor5-horizontal-line/dist/index.css";
import "@ckeditor/ckeditor5-html-embed/dist/index.css";
import "@ckeditor/ckeditor5-icons/dist/index.css";
import "@ckeditor/ckeditor5-image/dist/index.css";
import "@ckeditor/ckeditor5-link/dist/index.css";
import "@ckeditor/ckeditor5-list/dist/index.css";
import "@ckeditor/ckeditor5-markdown-gfm/dist/index.css";
import "@ckeditor/ckeditor5-mention/dist/index.css";
import "@ckeditor/ckeditor5-paste-from-office/dist/index.css";
import "@ckeditor/ckeditor5-remove-format/dist/index.css";
import "@ckeditor/ckeditor5-restricted-editing/dist/index.css";
import "@ckeditor/ckeditor5-style/dist/index.css";
import "@ckeditor/ckeditor5-table/dist/index.css";

import {
  Alignment,
  Autoformat,
  Autosave,
  BlockQuote,
  Bold,
  ClassicEditor,
  Code,
  CodeBlock,
  EditorConfig,
  Essentials,
  FontColor,
  FontFamily,
  FontSize,
  Heading,
  Highlight,
  HorizontalLine,
  HtmlEmbed,
  IconObjectLeft,
  Image,
  ImageInsertConfig,
  ImageInsertUI,
  ImageInsertViaUrl,
  ImageResizeEditing,
  ImageResizeHandles,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageUploadUI,
  Indent,
  Italic,
  Link,
  LinkImage,
  List,
  Mention,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableToolbar,
  Underline,
  Undo,
  Emoji,
  WoltlabAttachment,
  WoltlabAutoLink,
  WoltlabAutosave,
  WoltlabBbcode,
  WoltlabBlockQuote,
  WoltlabCode,
  WoltlabCodeBlock,
  WoltlabFontSize,
  WoltlabHtmlEmbed,
  WoltlabImage,
  WoltlabMagicParagraph,
  WoltlabMedia,
  WoltlabMention,
  WoltlabMetacode,
  WoltlabPasteFromOffice,
  WoltlabPasteTextColor,
  WoltlabSmiley,
  WoltlabSpoiler,
  WoltlabToolbarGroup,
  WoltlabUpload,
} from "./modules";

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
    Emoji,

    // Formatting
    Alignment,
    Autoformat,
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
    ImageInsertViaUrl,
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
    WoltlabAutoLink.WoltlabAutoLink,
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
    WoltlabPasteFromOffice.WoltlabPasteFromOffice,
    WoltlabPasteTextColor.WoltlabPasteTextColor,
    WoltlabSmiley.WoltlabSmiley,
    WoltlabSpoiler.WoltlabSpoiler,
    WoltlabToolbarGroup.WoltlabToolbarGroup,
    WoltlabUpload.WoltlabUpload,
    WoltlabFontSize.WoltlabFontSize,
  ],
};

export async function create(
  element: HTMLElement,
  configuration: EditorConfig,
): Promise<ClassicEditor> {
  configuration = Object.assign(configuration, defaultConfig);
  configuration.attachTo = element;

  const removePlugins = configuration.removePlugins || [];
  if (!removePlugins.includes("Image")) {
    const integrations: ImageInsertConfig["integrations"] = ["url"];
    if (!removePlugins.includes("WoltlabAttachment")) {
      integrations.unshift("upload");
    }

    configuration.image = {
      insert: {
        integrations,
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
            icon: IconObjectLeft,
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

  const editor = await ClassicEditor.create(configuration);

  return editor;
}

export * as CKEditor5 from './modules';
