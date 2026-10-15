/**
 * `Rect#toAbsoluteRect()` adds the window scroll and then subtracts the
 * viewport position of the positioned ancestor, counting the page scroll
 * twice. This went unnoticed because `getPositionedAncestor()` never returned
 * the `<body>` before v49, which is positioned in WoltLab Suite.
 *
 * See https://github.com/ckeditor/ckeditor5/issues/20251
 *
 * @author Alexander Ebert
 * @copyright 2001-2026 WoltLab GmbH
 * @license LGPL-2.1-or-later
 */

import {
  getBorderWidths,
  getPositionedAncestor,
  global,
  Rect,
} from "@ckeditor/ckeditor5-utils";

Rect.prototype.toAbsoluteRect = function (this: Rect): Rect {
  const source = (this as unknown as { _source: unknown })._source;
  const positionedAncestor =
    source instanceof HTMLElement ? getPositionedAncestor(source) : null;
  if (positionedAncestor === null) {
    return this.clone().moveBy(global.window.scrollX, global.window.scrollY);
  }

  const ancestorRect = new Rect(positionedAncestor);
  const borderWidths = getBorderWidths(positionedAncestor);

  return this.clone().moveBy(
    positionedAncestor.scrollLeft - ancestorRect.left - borderWidths.left,
    positionedAncestor.scrollTop - ancestorRect.top - borderWidths.top,
  );
};
