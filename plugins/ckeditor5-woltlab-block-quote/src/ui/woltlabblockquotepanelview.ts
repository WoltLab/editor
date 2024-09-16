/**
 * Creates and manages the editing UI for the modified quote block.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { Editor, icons } from "@ckeditor/ckeditor5-core";
import {
  ButtonView,
  createLabeledInputText,
  FocusableView,
  FocusCycler,
  InputTextView,
  LabeledFieldView,
  submitHandler,
  View,
  ViewCollection,
} from "@ckeditor/ckeditor5-ui";
import {
  FocusTracker,
  KeystrokeHandler,
  Locale,
} from "@ckeditor/ckeditor5-utils";

import WoltlabBlockQuoteFormRowView from "./woltlabblockquoteformrowview";

export class WoltlabBlockQuotePanelView extends View {
  readonly #insertButtonView: ButtonView;
  readonly #cancelButtonView: ButtonView;
  readonly #author: InputTextView;
  readonly #link: InputTextView;
  readonly focusTracker: FocusTracker;
  readonly keystrokes: KeystrokeHandler;
  readonly #focusables: ViewCollection<FocusableView>;
  readonly #focusCycler: FocusCycler;
  declare author: string;
  declare link: string;

  constructor(editor: Editor) {
    const { locale } = editor;

    super(locale);

    this.set("author", "");
    this.set("link", "");

    this.focusTracker = new FocusTracker();
    this.keystrokes = new KeystrokeHandler();

    this.#focusables = new ViewCollection();
    this.#focusCycler = this.#createFocusCycler();

    const authorView = this.#createAuthorView(locale);
    this.#author = authorView.fieldView as unknown as InputTextView;

    const linkView = this.#createFileView(locale);
    this.#link = linkView.fieldView as unknown as InputTextView;

    this.#insertButtonView = this.#createInsertButton(locale);
    this.#cancelButtonView = this.#createCancelButton(locale);

    this.#setupTemplate(locale, authorView, linkView);
  }

  /**
   * @inheritDoc
   */
  render() {
    super.render();

    submitHandler({
      view: this,
    });

    const childViews = [
      this.#author,
      this.#link,
      this.#insertButtonView,
      this.#cancelButtonView,
    ];

    childViews.forEach((view) => {
      this.#focusables.add(view);
      this.focusTracker.add(view.element!);
    });

    this.keystrokes.listenTo(this.element as any);
    this.keystrokes.set("arrowright", (data) => data.stopPropagation());
    this.keystrokes.set("arrowleft", (data) => data.stopPropagation());
    this.keystrokes.set("arrowup", (data) => data.stopPropagation());
    this.keystrokes.set("arrowdown", (data) => data.stopPropagation());

    this.listenTo(
      childViews[0].element!,
      "selectstart",
      (_evt, domEvt) => {
        domEvt.stopPropagation();
      },
      { priority: "high" },
    );

    this.on("submit", () => {
      this.fire("execute");
    });
  }

  /**
   * @inheritDoc
   */
  destroy() {
    super.destroy();

    this.focusTracker.destroy();
    this.keystrokes.destroy();
  }

  focus() {
    this.#focusCycler.focusFirst();
  }

  #createAuthorView(locale: Locale): LabeledFieldView {
    const t = locale.t;

    const labeledFieldView = new LabeledFieldView(
      locale,
      createLabeledInputText,
    );
    labeledFieldView.label = t("Author");

    labeledFieldView.fieldView
      .bind("value")
      .to(this, "author", (value) => value || "");
    labeledFieldView.fieldView.on("input", () => {
      this.author = (
        labeledFieldView.fieldView.element as HTMLInputElement
      ).value;
    });

    return labeledFieldView;
  }

  #createFileView(locale: Locale): LabeledFieldView {
    const t = locale.t;

    const labeledFieldView = new LabeledFieldView(
      locale,
      createLabeledInputText,
    );
    labeledFieldView.label = t("Link");

    labeledFieldView.fieldView
      .bind("value")
      .to(this, "link", (value) => value || "");
    labeledFieldView.fieldView.on("input", () => {
      this.link = (
        labeledFieldView.fieldView.element as HTMLInputElement
      ).value;
    });

    return labeledFieldView;
  }

  #createInsertButton(locale: Locale): ButtonView {
    const t = locale.t;
    const buttonView = new ButtonView(locale);

    buttonView.set({
      label: t("MENU_BAR_MENU_INSERT"),
      icon: icons.check,
      class: "ck-button-save",
      type: "submit",
      withText: true,
      isEnabled: true,
    });

    return buttonView;
  }

  #createCancelButton(locale: Locale): ButtonView {
    const t = locale.t;
    const buttonView = new ButtonView(locale);

    buttonView.set({
      label: t("Cancel"),
      icon: icons.cancel,
      class: "ck-button-cancel",
      withText: true,
    });

    buttonView.delegate("execute").to(this, "cancel");

    return buttonView;
  }

  #setupTemplate(
    locale: Locale,
    authorView: LabeledFieldView,
    linkView: LabeledFieldView,
  ): void {
    this.setTemplate({
      tag: "form",

      attributes: {
        class: ["ck", "ck-vertical-form", "ck-woltlabblockquote-insert-form"],

        tabindex: "-1",
      },

      children: [
        authorView,
        linkView,
        new WoltlabBlockQuoteFormRowView(locale, {
          children: [this.#insertButtonView, this.#cancelButtonView],
          class: "ck-woltlabblockquote-insert-form__action-row",
        }),
      ],
    });
  }

  #createFocusCycler(): FocusCycler {
    return new FocusCycler({
      focusables: this.#focusables,
      focusTracker: this.focusTracker,
      keystrokeHandler: this.keystrokes,
      actions: {
        focusPrevious: "shift + tab",
        focusNext: "tab",
      },
    });
  }
}

export default WoltlabBlockQuotePanelView;

/**
 * Fired when the form view is submitted (when one of the children triggered the submit event),
 * e.g. by a click on {@link #insertButtonView}.
 *
 * @event submit
 */

/**
 * Fired when the form view is canceled, e.g. by a click on {@link #cancelButtonView}.
 *
 * @event cancel
 */
