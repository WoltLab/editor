import { Database } from "emoji-picker-element";

declare module "emoji-picker-element" {
  export interface Picker extends HTMLElement {
    database: Database;
  }
}
