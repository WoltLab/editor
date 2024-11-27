/**
 * @author Alexander Ebert
 * @copyright 2001-2023 WoltLab GmbH
 * @license LGPL-2.1-or-later
 * @since 6.0
 */
// The import prevents the error `Cannot find module '….svg' or its corresponding type declarations.` from occurring if the editor is included as a dependency.
import "./types";

export { create } from "./app";
export * as CKEditor5 from "./modules";
