/**
 * Inserts or removes the spoiler at the selected position or range.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Command } from "@ckeditor/ckeditor5-core";
import { Element, Range } from "@ckeditor/ckeditor5-engine";
import { first } from "@ckeditor/ckeditor5-utils";

import type { Position, Schema, Writer } from "@ckeditor/ckeditor5-engine";

export class WoltlabSpoilerCommand extends Command {
  override execute() {
    const { model } = this.editor;
    const { schema } = model;
    const { selection } = model.document;

    const blocks = Array.from(selection.getSelectedBlocks());

    model.change((writer) => {
      if (this.value) {
        this.#removeSpoiler(writer, blocks);
      } else {
        const spoilerCandidates = blocks.filter((block) => {
          return (
            this.#findSpoilerContent(block) || this.#canBeSpoiler(schema, block)
          );
        });

        this.#applySpoiler(writer, spoilerCandidates);
      }
    });
  }

  override refresh() {
    this.value = this.#getValue();
    this.isEnabled = this.#getIsEnabled();
  }

  #removeSpoiler(writer: Writer, blocks: Element[]): void {
    for (const block of blocks) {
      const spoilerContent = this.#findSpoilerContent(block);
      if (spoilerContent === null) {
        continue;
      }

      const spoilerTitle = spoilerContent.previousSibling;
      if (
        spoilerTitle === null ||
        !spoilerTitle.is("element", "spoilerTitle")
      ) {
        throw new Error(
          "Invalid structure, expected a `<spoilerTitle>` adjacent to `<spoilerContent>`",
          {
            cause: {
              spoilerTitle,
            },
          },
        );
      }

      const spoiler = spoilerContent.parent;
      if (!(spoiler instanceof Element) || !spoiler.is("element", "spoiler")) {
        throw new Error(
          "Invalid structure, expected a `<spoiler>` as the parent of a `<spoilerContent>`",
          {
            cause: {
              spoiler,
            },
          },
        );
      }

      writer.remove(spoilerTitle);
      writer.unwrap(spoiler);
      writer.unwrap(spoilerContent);
    }
  }

  #applySpoiler(writer: Writer, blocks: Element[]) {
    const spoilersToMerge: Element[] = [];

    this.#getRangesOfBlockGroups(writer, blocks)
      .reverse()
      .forEach((groupRange) => {
        let spoilerContent = this.#findSpoilerContent(groupRange.start);

        if (!spoilerContent) {
          spoilerContent = this.#wrapInSpoiler(writer, groupRange);
        }

        spoilersToMerge.push(spoilerContent.parent as Element);
      });

    spoilersToMerge.reverse().reduce((currentSpoiler, nextSpoiler) => {
      if (currentSpoiler.nextSibling === nextSpoiler) {
        const currentSpoilerContent = currentSpoiler.getChild(1) as Element;

        const nextSpoilerContent = nextSpoiler.getChild(1) as Element;
        writer.move(
          writer.createRangeIn(nextSpoilerContent),
          writer.createPositionAt(currentSpoilerContent, "end"),
        );

        writer.remove(nextSpoiler);

        return currentSpoiler;
      }

      return nextSpoiler;
    });
  }

  #getRangesOfBlockGroups(writer: Writer, blocks: Element[]): Range[] {
    let startPosition: Position | null = null;
    let i = 0;
    const ranges: Range[] = [];

    while (i < blocks.length) {
      const block = blocks[i];
      const nextBlock = blocks[i + 1];

      if (!startPosition) {
        startPosition = writer.createPositionBefore(block);
      }

      if (!nextBlock || block.nextSibling !== nextBlock) {
        ranges.push(
          writer.createRange(startPosition, writer.createPositionAfter(block)),
        );
        startPosition = null;
      }

      i++;
    }

    return ranges;
  }

  #getIsEnabled(): boolean {
    if (this.value) {
      return true;
    }

    const { selection } = this.editor.model.document;

    const firstBlock = first(selection.getSelectedBlocks());

    if (!firstBlock) {
      return false;
    }

    const { schema } = this.editor.model;

    return this.#canBeSpoiler(schema, firstBlock);
  }

  #getValue(): boolean {
    const { selection } = this.editor.model.document;
    const firstBlock = first(selection.getSelectedBlocks());

    return !!(firstBlock && this.#findSpoilerContent(firstBlock));
  }

  #findSpoilerContent(elementOrPosition: Element | Position): Element | null {
    if (!(elementOrPosition.parent instanceof Element)) {
      return null;
    }

    if (elementOrPosition.parent.name === "spoilerContent") {
      return elementOrPosition.parent;
    }

    return this.#findSpoilerContent(elementOrPosition.parent);
  }

  #canBeSpoiler(schema: Schema, block: Element): boolean {
    const isSpoilerAllowed = schema.checkChild(
      block.parent as Element,
      "spoiler",
    );
    const isBlockAllowedInSpoiler = schema.checkChild("spoilerContent", block);

    return isSpoilerAllowed && isBlockAllowedInSpoiler;
  }

  #wrapInSpoiler(writer: Writer, content: Range): Element {
    const spoilerContent = writer.createElement("spoilerContent");
    writer.wrap(content, spoilerContent);

    const spoiler = writer.createElement("spoiler");
    writer.wrap(writer.createRangeOn(spoilerContent), spoiler);

    const spoilerTitle = writer.createElement("spoilerTitle");
    writer.insert(spoilerTitle, spoiler, 0);

    return spoilerContent;
  }
}

export default WoltlabSpoilerCommand;
