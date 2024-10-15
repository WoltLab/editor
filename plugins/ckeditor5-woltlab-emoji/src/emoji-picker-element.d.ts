/**
 * @author Olaf Braun
 * @copyright 2001-2024 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.2
 */

import { Database } from "emoji-picker-element";

declare module "emoji-picker-element" {
  export interface Picker extends HTMLElement {
    database: Database;
  }
}
