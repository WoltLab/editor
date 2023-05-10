/**
 * Creates and manages the editing UI for the modified code block.
 *
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */

import { getNormalizedAndLocalizedLanguageDefinitions } from "@ckeditor/ckeditor5-code-block/src/utils";
import { Editor, icons } from "@ckeditor/ckeditor5-core";
import {
  addListToDropdown,
  ButtonView,
  createDropdown,
  createLabeledInputNumber,
  createLabeledInputText,
  FocusCycler,
  InputNumberView,
  InputTextView,
  LabeledFieldView,
  type ListDropdownButtonDefinition,
  type ListDropdownItemDefinition,
  Model,
  submitHandler,
  View,
  ViewCollection,
} from "@ckeditor/ckeditor5-ui";
import {
  Collection,
  FocusTracker,
  KeystrokeHandler,
  Locale,
} from "@ckeditor/ckeditor5-utils";

import WoltlabCodeBlockFormRowView from "./woltlabcodeblockformrowview";

import type { DropdownView } from "@ckeditor/ckeditor5-ui";

type CodeBlockLanguageDefinition = ReturnType<
  typeof getNormalizedAndLocalizedLanguageDefinitions
>;

export class WoltlabCodeBlockPanelView extends View {
  readonly #insertButtonView: ButtonView;
  readonly #cancelButtonView: ButtonView;
  readonly #highlightersView: DropdownView;
  readonly #lineView: InputNumberView;
  readonly #fileView: InputTextView;
  readonly focusTracker: FocusTracker;
  readonly keystrokes: KeystrokeHandler;
  readonly #focusables: ViewCollection<View>;
  readonly #focusCycler: FocusCycler;
  declare imageURLInputValue: string;
  declare file: string;
  declare highlighter: string;
  declare line: string;

  constructor(editor: Editor) {
    const { locale } = editor;

    super(locale);

    this.set("file", "");
    this.set("highlighter", "");
    this.set("line", "");

    this.focusTracker = new FocusTracker();
    this.keystrokes = new KeystrokeHandler();

    this.#focusables = new ViewCollection();
    this.#focusCycler = this.#createFocusCycler();

    const normalizedLanguageDefs =
      getNormalizedAndLocalizedLanguageDefinitions(editor);
    this.#highlightersView = this.#createHighlighterDropdown(
      locale,
      normalizedLanguageDefs
    );

    const lineNumberView = this.#createLineView(locale);
    this.#lineView = lineNumberView.fieldView as unknown as InputNumberView;

    const filenameView = this.#createFileView(locale);
    this.#fileView = filenameView.fieldView as unknown as InputTextView;

    this.#insertButtonView = this.#createInsertButton(locale);
    this.#cancelButtonView = this.#createCancelButton(locale);

    this.#setupTemplate(locale, lineNumberView, filenameView);
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
      this.#highlightersView,
      this.#lineView,
      this.#fileView,
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
      { priority: "high" }
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

  #createHighlighterDropdown(
    locale: Locale,
    normalizedLanguageDefs: CodeBlockLanguageDefinition
  ): DropdownView {
    const t = locale.t;
    const dropdown = createDropdown(locale);
    const groupDefinitions = this.#getLanguageGroupListItemDefinitions(
      normalizedLanguageDefs
    );

    this.highlighter = (groupDefinitions.first! as ListDropdownButtonDefinition)
      .model._codeBlockLanguage as string;

    dropdown.buttonView.bind("label").to(this, "highlighter", (highlighter) => {
      const language = highlighter ? highlighter.toString() : "plain";

      return normalizedLanguageDefs.find((def) => def.language == language)!
        .label;
    });

    dropdown.buttonView.set({
      isOn: false,
      withText: true,
      tooltip: t("Language"),
      class: ["ck-dropdown__button_label-width_auto"],
    });

    dropdown.on("execute", (evt) => {
      this.highlighter = (evt.source as Model)._codeBlockLanguage as string;
    });

    addListToDropdown(dropdown, groupDefinitions);

    return dropdown;
  }

  #createLineView(locale: Locale): LabeledFieldView {
    const t = locale.t;

    const labeledFieldView = new LabeledFieldView(
      locale,
      createLabeledInputNumber
    );
    labeledFieldView.label = t("Line number");

    labeledFieldView.fieldView
      .bind("value")
      .to(this, "line", (value) => value || "");
    labeledFieldView.fieldView.on("input", () => {
      this.line = (
        labeledFieldView.fieldView.element as HTMLInputElement
      ).value;
    });

    return labeledFieldView;
  }

  #createFileView(locale: Locale): LabeledFieldView {
    const t = locale.t;

    const labeledFieldView = new LabeledFieldView(
      locale,
      createLabeledInputText
    );
    labeledFieldView.label = t("Filename");

    labeledFieldView.fieldView
      .bind("value")
      .to(this, "file", (value) => value || "");
    labeledFieldView.fieldView.on("input", () => {
      this.file = (
        labeledFieldView.fieldView.element as HTMLInputElement
      ).value;
    });

    return labeledFieldView;
  }

  #getLanguageGroupListItemDefinitions(
    normalizedLanguageDefs: CodeBlockLanguageDefinition
  ): Collection<ListDropdownItemDefinition> {
    const groupDefs = new Collection<ListDropdownItemDefinition>();

    for (const languageDef of normalizedLanguageDefs) {
      const definition: ListDropdownItemDefinition = {
        type: "button",
        model: new Model({
          _codeBlockLanguage: languageDef.language,
          label: languageDef.label,
          withText: true,
        }),
      };

      definition.model.bind("isOn").to(this, "highlighter", (value) => {
        return value === definition.model._codeBlockLanguage;
      });

      groupDefs.add(definition);
    }

    return groupDefs;
  }

  #createInsertButton(locale: Locale): ButtonView {
    const t = locale.t;
    const buttonView = new ButtonView(locale);

    buttonView.set({
      label: t("Insert"),
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
    lineNumberView: LabeledFieldView,
    filenameView: LabeledFieldView
  ): void {
    this.setTemplate({
      tag: "form",

      attributes: {
        class: ["ck", "ck-vertical-form", "ck-woltlabcodeblock-insert-form"],

        tabindex: "-1",
      },

      children: [
        this.#highlightersView,
        lineNumberView,
        filenameView,
        new WoltlabCodeBlockFormRowView(locale, {
          children: [this.#insertButtonView, this.#cancelButtonView],
          class: "ck-woltlabcodeblock-insert-form__action-row",
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

export default WoltlabCodeBlockPanelView;

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
