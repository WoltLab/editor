/**
 * @author    Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license   LGPL-2.1-or-later
 * @since     6.1
 */

import { Editor, Plugin } from "@ckeditor/ckeditor5-core";
import { clickOutsideHandler, ContextualBalloon } from "@ckeditor/ckeditor5-ui";
import {
  TextWatcher,
  TextWatcherMatchedEvent,
} from "@ckeditor/ckeditor5-typing";
import {
  Collection,
  env,
  keyCodes,
  PositionOptions,
  Rect,
} from "@ckeditor/ckeditor5-utils";
import { Marker, ViewDocumentKeyDownEvent } from "@ckeditor/ckeditor5-engine";
import MentionsView from "@ckeditor/ckeditor5-mention/src/ui/mentionsview";
import { Mention } from "@ckeditor/ckeditor5-mention";
import { MentionFeedObjectItem } from "@ckeditor/ckeditor5-mention/src/mentionconfig";
import MentionListItemView from "@ckeditor/ckeditor5-mention/src/ui/mentionlistitemview";
import DomWrapperView from "@ckeditor/ckeditor5-mention/src/ui/domwrapperview";
import WoltlabSmileyCommand from "./woltlabsmileycommand";

const MARKER_NAME = "smiley";
const VERTICAL_SPACING = 3;

// Dropdown commit key codes.
const CommitKeyCodes = [keyCodes.enter, keyCodes.tab];
const HandledKeyCodes = [
  keyCodes.arrowup,
  keyCodes.arrowdown,
  keyCodes.esc,
  ...CommitKeyCodes,
];

export class WoltlabSmileyUi extends Plugin {
  #balloon: ContextualBalloon | undefined;
  readonly #smileyView: MentionsView;
  #items = new Collection<{
    item: MentionFeedObjectItem;
    marker: string;
  }>();
  /**
   * @inheritDoc
   */
  constructor(editor: Editor) {
    super(editor);
    this.#smileyView = this.#createSmileyView();
  }

  /**
   * @inheritDoc
   */
  public static get pluginName() {
    return "WoltlabSmileyUI" as const;
  }

  /**
   * @inheritDoc
   */
  public static get requires() {
    return [ContextualBalloon, Mention] as const;
  }

  get #isUIVisible(): boolean {
    return this.#balloon!.visibleView === this.#smileyView;
  }

  /**
   * @inheritDoc
   */
  public init(): void {
    this.#balloon = this.editor.plugins.get(ContextualBalloon);
    this.editor.commands.add("smiley", new WoltlabSmileyCommand(this.editor));

    this.editor.editing.view.document.on<ViewDocumentKeyDownEvent>(
      "keydown",
      (evt, data) => {
        if (isHandledKey(data.keyCode) && this.#isUIVisible) {
          data.preventDefault();
          evt.stop(); // Required for Enter key overriding.

          if (data.keyCode == keyCodes.arrowdown) {
            this.#smileyView.selectNext();
          }

          if (data.keyCode == keyCodes.arrowup) {
            this.#smileyView.selectPrevious();
          }

          if (CommitKeyCodes.includes(data.keyCode)) {
            this.#smileyView.executeSelected();
          }

          if (data.keyCode == keyCodes.esc) {
            this.#hideBalloon();
          }
        }
      },
      { priority: "highest" },
    );

    this.#registerTextWatcher();

    clickOutsideHandler({
      emitter: this.#smileyView,
      activator: () => this.#isUIVisible,
      contextElements: () => [this.#balloon!.view.element!],
      callback: () => this.#hideBalloon(),
    });
    this.listenTo(this.editor, "change:isReadOnly", () => {
      this.#hideBalloon();
    });
  }

  /**
   * @inheritDoc
   */
  public override destroy(): void {
    super.destroy();

    this.#smileyView?.destroy();
  }

  /**
   * {@link module:mention/mentionui#_createMentionView()
   */
  #createSmileyView(): MentionsView {
    const mentionsView = new MentionsView(this.editor.locale);
    mentionsView.items.bindTo(this.#items).using((data) => {
      const { item, marker } = data;

      if (mentionsView.items.length >= 10) {
        return null;
      }

      const listItemView = new MentionListItemView(this.editor.locale);

      const view = this.#renderItem(item);
      view.delegate("execute").to(listItemView);

      listItemView.children.add(view);
      listItemView.item = item;
      listItemView.marker = marker;

      listItemView.on("execute", () => {
        mentionsView.fire("execute", {
          item,
          marker,
        });
      });

      return listItemView;
    });

    mentionsView.on("execute", (evt, data) => {
      const editor = this.editor;
      const model = editor.model;
      const item = data.item;

      const smileyMarker = editor.model.markers.get(MARKER_NAME);

      // Create a range on matched text.
      const end = model.createPositionAt(model.document.selection.focus!);
      const start = model.createPositionAt(smileyMarker!.getStart());
      const range = model.createRange(start, end);

      this.#hideBalloon();

      editor.execute("smiley", {
        smiley: item,
        html: item.text,
        range,
      });

      editor.editing.view.focus();
    });

    return mentionsView;
  }

  #renderItem(item: MentionFeedObjectItem): DomWrapperView {
    const editor = this.editor;
    const span = document.createElement("span");
    span.classList.add("ckeditor5__mention", "ckeditor5__smiley");
    span.innerHTML = `${item.text} ${item.id}`;

    return new DomWrapperView(editor.locale, span);
  }

  #registerTextWatcher() {
    const editor = this.editor;
    const watcher = new TextWatcher(editor.model, (text: string) => {
      return getLastPosition(text) !== undefined;
    });
    watcher.on<TextWatcherMatchedEvent>("matched", (evt, data) => {
      const position = getLastPosition(data.text)!;
      const smileyCode = data.text.substring(position).match(getRegexExp())![0];
      const start = data.range.start.getShiftedBy(position);
      const markerRange = editor.model.createRange(
        start,
        start.getShiftedBy(1),
      );

      if (checkIfMarkerExists(editor)) {
        // Update marker position
        const mentionMarker = editor.model.markers.get(MARKER_NAME)!;
        editor.model.change((writer) => {
          writer.updateMarker(mentionMarker, { range: markerRange });
        });
      } else {
        // Create new marker
        editor.model.change((writer) => {
          writer.addMarker(MARKER_NAME, {
            range: markerRange,
            usingOperation: false,
            affectsData: false,
          });
        });
      }

      this.#items.clear();
      const emojis = editor.config.get("woltlabSmileys") || [];
      emojis
        .filter((emoji) => {
          return emoji.code.startsWith(smileyCode);
        })
        .forEach((emoji) => {
          this.#items.add({
            item: {
              id: emoji.code,
              text: emoji.html,
            },
            marker: MARKER_NAME,
          });
        });

      if (this.#items.length) {
        this.#showBalloon();
      } else {
        this.#hideBalloon();
      }
    });
    watcher.on("unmatched", () => {
      this.#hideBalloon();
    });
    const command = editor.commands.get("smiley")!;
    watcher.bind("isEnabled").to(command);
  }

  #hideBalloon() {
    if (this.#balloon!.hasView(this.#smileyView)) {
      this.#balloon!.remove(this.#smileyView);
    }

    if (checkIfMarkerExists(this.editor)) {
      this.editor.model.change((writer) => writer.removeMarker(MARKER_NAME));
    }
  }

  /**
   * {@link module:mention/mentionui#_showOrUpdateUI()}
   */
  #showBalloon() {
    const marker = this.editor.model.markers.get(MARKER_NAME);
    if (!marker) {
      this.#hideBalloon();
      return;
    }

    if (this.#isUIVisible) {
      this.#balloon!.updatePosition(
        this._getBalloonPanelPositionData(marker, this.#smileyView.position),
      );
    } else {
      this.#balloon!.add({
        view: this.#smileyView,
        position: this._getBalloonPanelPositionData(
          marker,
          this.#smileyView.position,
        ),
        singleViewMode: true,
      });
    }

    this.#smileyView.position = this.#balloon!.view.position;
    this.#smileyView.selectFirst();
  }

  /**
   * {@link module:mention/mentionui#_getBalloonPanelPositionData()}
   */
  private _getBalloonPanelPositionData(
    mentionMarker: Marker,
    preferredPosition: MentionsView["position"],
  ): Partial<PositionOptions> {
    const editor = this.editor;
    const editing = editor.editing;
    const domConverter = editing.view.domConverter;
    const mapper = editing.mapper;
    const uiLanguageDirection = editor.locale.uiLanguageDirection;

    return {
      target: () => {
        let modelRange = mentionMarker.getRange();

        // Target the UI to the model selection range - the marker has been removed so probably the UI will not be shown anyway.
        // The logic is used by ContextualBalloon to display another panel in the same place.
        if (modelRange.start.root.rootName == "$graveyard") {
          modelRange = editor.model.document.selection.getFirstRange()!;
        }

        const viewRange = mapper.toViewRange(modelRange);
        const rangeRects = Rect.getDomRangeRects(
          domConverter.viewRangeToDom(viewRange),
        );

        return rangeRects.pop()!;
      },
      limiter: () => {
        const view = this.editor.editing.view;
        const viewDocument = view.document;
        const editableElement = viewDocument.selection.editableElement;

        if (editableElement) {
          return view.domConverter.mapViewToDom(
            editableElement.root,
          ) as HTMLElement;
        }

        return null;
      },
      positions: getBalloonPanelPositions(
        preferredPosition,
        uiLanguageDirection,
      ),
    };
  }
}

function getLastPosition(text: string): number | undefined {
  const lastIndex = text.lastIndexOf(":");
  if (lastIndex === -1 || !text.substring(lastIndex - 1).match(getRegexExp())) {
    return undefined;
  }

  return lastIndex;
}

function checkIfMarkerExists(editor: Editor): boolean {
  return editor.model.markers.has(MARKER_NAME);
}

/**
 * {@link module:mention/mentionui#getBalloonPanelPositions()}
 */
function getBalloonPanelPositions(
  preferredPosition: string | undefined,
  uiLanguageDirection: string,
): PositionOptions["positions"] {
  const positions: Record<string, PositionOptions["positions"][0]> = {
    // Positions the panel to the southeast of the caret rectangle.
    caret_se: (targetRect: Rect) => {
      return {
        top: targetRect.bottom + VERTICAL_SPACING,
        left: targetRect.right,
        name: "caret_se",
        config: {
          withArrow: false,
        },
      };
    },

    // Positions the panel to the northeast of the caret rectangle.
    caret_ne: (targetRect: Rect, balloonRect: Rect) => {
      return {
        top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
        left: targetRect.right,
        name: "caret_ne",
        config: {
          withArrow: false,
        },
      };
    },

    // Positions the panel to the southwest of the caret rectangle.
    caret_sw: (targetRect: Rect, balloonRect: Rect) => {
      return {
        top: targetRect.bottom + VERTICAL_SPACING,
        left: targetRect.right - balloonRect.width,
        name: "caret_sw",
        config: {
          withArrow: false,
        },
      };
    },

    // Positions the panel to the northwest of the caret rect.
    caret_nw: (targetRect: Rect, balloonRect: Rect) => {
      return {
        top: targetRect.top - balloonRect.height - VERTICAL_SPACING,
        left: targetRect.right - balloonRect.width,
        name: "caret_nw",
        config: {
          withArrow: false,
        },
      };
    },
  };

  // Returns only the last position if it was matched to prevent the panel from jumping after the first match.
  if (Object.prototype.hasOwnProperty.call(positions, preferredPosition!)) {
    return [positions[preferredPosition!]];
  }

  // By default, return all position callbacks ordered depending on the UI language direction.
  return uiLanguageDirection !== "rtl"
    ? [
        positions.caret_se,
        positions.caret_sw,
        positions.caret_ne,
        positions.caret_nw,
      ]
    : [
        positions.caret_sw,
        positions.caret_se,
        positions.caret_nw,
        positions.caret_ne,
      ];
}

/**
 * {@link module:mention/mentionui#createRegExp()}
 */
export function getRegexExp(): RegExp {
  const openAfterCharacters = env.features.isRegExpUnicodePropertySupported
    ? "\\p{Ps}\\p{Pi}\"'"
    : "\\(\\[{\"'";
  const pattern = `(?:^|[ ${openAfterCharacters}])(:)([a-z]+(?:_[a-z]+)*)$`;
  return new RegExp(pattern, "u");
}

function isHandledKey(keyCode: number): boolean {
  return HandledKeyCodes.includes(keyCode);
}

export type WoltlabSmileyItem = {
  code: string;
  html: string;
};

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    woltlabSmileys?: WoltlabSmileyItem[];
  }
}
