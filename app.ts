/**
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { ImageInsertConfig } from "@ckeditor/ckeditor5-image/src/imageconfig";
import {
  Alignment,
  Autosave,
  BasicStyles,
  BlockQuote,
  ClassicEditor,
  CodeBlock,
  Core,
  Essentials,
  Font,
  Heading,
  Highlight,
  HorizontalLine,
  HtmlEmbed,
  Image,
  Indent,
  Link,
  List,
  Mention,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  Table,
  Undo,
  WoltlabAttachment,
  WoltlabAutosave,
  WoltlabBbcode,
  WoltlabBlockQuote,
  WoltlabCode,
  WoltlabCodeBlock,
  WoltlabFontSize,
  WoltlabHtmlEmbed,
  WoltlabImage,
  WoltlabMagicParagraph,
  WoltlabMention,
  WoltlabMetacode,
  WoltlabSmiley,
  WoltlabSpoiler,
  WoltlabToolbarGroup,
  WoltlabUpload,
} from "./modules";

const defaultConfig: Core.EditorConfig = {
  plugins: [
    // Internals
    Autosave.Autosave,
    Essentials.Essentials,
    Indent.Indent,
    Mention.Mention,
    Paragraph.Paragraph,
    PasteFromOffice.PasteFromOffice,
    Undo.Undo,

    // Formatting
    Alignment.Alignment,
    BasicStyles.Bold,
    BasicStyles.Code,
    Font.FontColor,
    Font.FontFamily,
    Font.FontSize,
    Heading.Heading,
    Highlight.Highlight,
    BasicStyles.Italic,
    RemoveFormat.RemoveFormat,
    BasicStyles.Strikethrough,
    BasicStyles.Subscript,
    BasicStyles.Superscript,
    BasicStyles.Underline,

    // Components
    BlockQuote.BlockQuote,
    CodeBlock.CodeBlock,
    HtmlEmbed.HtmlEmbed,
    HorizontalLine.HorizontalLine,
    Image.Image,
    Image.ImageInsertUI,
    Image.ImageInsertViaUrl,
    Image.ImageToolbar,
    Image.ImageResizeEditing,
    Image.ImageResizeHandles,
    Image.ImageStyle,
    Image.ImageUpload,
    Image.ImageUploadUI,
    Link.Link,
    Link.LinkImage,
    List.List,
    Table.Table,
    Table.TableToolbar,

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
    WoltlabMention.WoltlabMention,
    WoltlabMetacode.WoltlabMetacode,
    WoltlabSmiley.WoltlabSmiley,
    WoltlabSpoiler.WoltlabSpoiler,
    WoltlabToolbarGroup.WoltlabToolbarGroup,
    WoltlabUpload.WoltlabUpload,
    WoltlabFontSize.WoltlabFontSize,
  ],
};

export async function create(
  element: HTMLElement,
  configuration: Core.EditorConfig,
): Promise<ClassicEditor.ClassicEditor> {
  configuration = Object.assign(configuration, defaultConfig);

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
            icon: Core.icons.objectLeft,
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

  const editor = await ClassicEditor.ClassicEditor.create(
    element,
    configuration,
  );

  // Unconditionally disable the `AutoLink` plugin which interferes with our
  // own link detection and all creates potentially invalid links.
  // See https://github.com/ckeditor/ckeditor5/issues/14497
  if (editor.plugins.has(Link.AutoLink)) {
    const autoLink = editor.plugins.get(Link.AutoLink);
    autoLink.forceDisabled("app.ts");
  }

  return editor;
}
