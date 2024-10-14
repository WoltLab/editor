/**
 * @author    Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license   LGPL-2.1-or-later
 * @since     6.2
 */

import { Editor, Plugin } from "@ckeditor/ckeditor5-core";
import {
  clickOutsideHandler,
  ContextualBalloon,
  createDropdown,
} from "@ckeditor/ckeditor5-ui";
import {
  TextWatcher,
  TextWatcherMatchedEvent,
  Typing,
} from "@ckeditor/ckeditor5-typing";
import {
  Collection,
  env,
  keyCodes,
  PositionOptions,
  Rect,
  EventInfo,
} from "@ckeditor/ckeditor5-utils";
import { Marker, ViewDocumentKeyDownEvent } from "@ckeditor/ckeditor5-engine";
import {
  DomWrapperView,
  MentionFeedObjectItem,
  MentionListItemView,
  MentionsView,
} from "@ckeditor/ckeditor5-mention/";
import { Picker } from "emoji-picker-element";
import emojiIcon from "../theme/icons/smile.svg";
import WoltlabCoreEmojiPickerView from "./ui/woltlabcoreemojipickerview";
import { EmojiClickEvent } from "emoji-picker-element/shared";

const MARKER_NAME = "emoji";
const VERTICAL_SPACING = 3;

// Dropdown commit key codes.
const CommitKeyCodes = [keyCodes.enter, keyCodes.tab];
const HandledKeyCodes = [
  keyCodes.arrowup,
  keyCodes.arrowdown,
  keyCodes.esc,
  ...CommitKeyCodes,
];

export class WoltlabEmoji extends Plugin {
  #emojiPicker?: Picker = undefined;
  #balloon: ContextualBalloon | undefined;
  readonly #emojiView: MentionsView;
  #items = new Collection<{
    item: MentionFeedObjectItem;
    marker: string;
  }>();

  /**
   * @inheritDoc
   */
  constructor(editor: Editor) {
    super(editor);
    this.#emojiView = this.#createEmojiView();
  }

  /**
   * @inheritDoc
   */
  public static get pluginName() {
    return "WoltlabEmoji" as const;
  }

  /**
   * @inheritDoc
   */
  public static get requires() {
    return [Typing, ContextualBalloon] as const;
  }

  get #isUIVisible(): boolean {
    return this.#balloon!.visibleView === this.#emojiView;
  }

  /**
   * @inheritDoc
   */
  public init(): void {
    const editor = this.editor;
    const inputCommand = editor.commands.get("input")!;

    editor.ui.componentFactory.add("WoltlabEmoji", (locale) => {
      const dropdownView = createDropdown(locale);
      dropdownView.buttonView.set({
        label: editor.t("Emoji"),
        icon: emojiIcon,
        tooltip: true,
      });
      dropdownView.bind("isEnabled").to(inputCommand);

      const emojiPickerView = new WoltlabCoreEmojiPickerView(locale);
      this.listenTo(
        emojiPickerView,
        "emoji-click",
        this.#emojiClicked.bind(this),
      );

      if (!emojiPickerView.isRendered) {
        emojiPickerView.render();
      }
      this.#registerEmojiPicker(emojiPickerView.element!);

      dropdownView.panelView.children.add(emojiPickerView);

      return dropdownView;
    });

    this.#balloon = this.editor.plugins.get(ContextualBalloon);

    this.editor.editing.view.document.on<ViewDocumentKeyDownEvent>(
      "keydown",
      (evt, data) => {
        if (isHandledKey(data.keyCode) && this.#isUIVisible) {
          data.preventDefault();
          evt.stop(); // Required for Enter key overriding.

          if (data.keyCode == keyCodes.arrowdown) {
            this.#emojiView.selectNext();
          }

          if (data.keyCode == keyCodes.arrowup) {
            this.#emojiView.selectPrevious();
          }

          if (CommitKeyCodes.includes(data.keyCode)) {
            this.#emojiView.executeSelected();
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
      emitter: this.#emojiView,
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

    this.#emojiView?.destroy();
  }

  #emojiClicked(evt: EventInfo, emojiClickData: EmojiClickEvent) {
    const editor = this.editor;

    if ("unicode" in emojiClickData.detail) {
      editor.execute("input", { text: emojiClickData.detail.unicode });
    } else {
      // TODO custom emoji
    }

    editor.editing.view.focus();
  }

  #registerEmojiPicker(emojiPicker: Picker) {
    if (this.#emojiPicker !== undefined) {
      return;
    }

    this.#emojiPicker = emojiPicker;
  }

  /**
   * {@link module:mention/mentionui#_createMentionView()
   */
  #createEmojiView(): MentionsView {
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

      const emojiMarker = editor.model.markers.get(MARKER_NAME);

      // Create a range on matched text.
      const end = model.createPositionAt(model.document.selection.focus!);
      const start = model.createPositionAt(emojiMarker!.getStart());
      const range = model.createRange(start, end);

      this.#hideBalloon();

      this.editor.execute("insertText", { text: item.text, range: range });

      editor.editing.view.focus();
    });

    return mentionsView;
  }

  #renderItem(item: MentionFeedObjectItem): DomWrapperView {
    const editor = this.editor;
    const span = document.createElement("span");
    span.classList.add("ckeditor5__mention", "ckeditor5__emoji");
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
      const emojiCode = data.text.substring(position).match(getRegexExp())![0];
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

      this.#emojiPicker?.database
        .getEmojiBySearchQuery(emojiCode.substring(1))
        .then((emojis) => {
          emojis.forEach((emoji) => {
            if (!("unicode" in emoji)) {
              return;
            }

            this.#items.add({
              item: {
                id: emoji.annotation,
                text: emoji.unicode,
              },
              marker: MARKER_NAME,
            });
          });
        })
        .finally(() => {
          if (this.#items.length) {
            this.#showBalloon();
          } else {
            this.#hideBalloon();
          }
        });
    });
    watcher.on("unmatched", () => {
      this.#hideBalloon();
    });
  }

  #hideBalloon() {
    if (this.#balloon!.hasView(this.#emojiView)) {
      this.#balloon!.remove(this.#emojiView);
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
        this._getBalloonPanelPositionData(marker, this.#emojiView.position),
      );
    } else {
      this.#balloon!.add({
        view: this.#emojiView,
        position: this._getBalloonPanelPositionData(
          marker,
          this.#emojiView.position,
        ),
        singleViewMode: true,
      });
    }

    this.#emojiView.position = this.#balloon!.view.position;
    this.#emojiView.selectFirst();
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
