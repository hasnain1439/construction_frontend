/**
 * Translatable messages for places that cannot call a hook — zod schemas, constants, helpers.
 * `msg("validation.required", { label: "field.amount" })` encodes the key (and its values) into a
 * string; `useFieldError` / `useMessageT` turn it into text in the current language. A value that
 * is itself a dictionary key ("field.amount") is translated too. Plain strings pass through unchanged.
 */
import type { TranslationKey, TranslationVars } from "./useT";

const MARKER = "⁣i18n:";

/** Encode a dictionary key (with `{placeholder}` values) for later translation. */
export function msg(key: TranslationKey, vars?: TranslationVars): string {
  return MARKER + JSON.stringify(vars ? [key, vars] : [key]);
}

/** `[key, vars]` when `text` came from `msg()`, otherwise null. */
export function decodeMsg(text: string): [TranslationKey, TranslationVars | undefined] | null {
  if (!text.startsWith(MARKER)) return null;
  try {
    const [key, vars] = JSON.parse(text.slice(MARKER.length)) as [TranslationKey, TranslationVars?];
    return [key, vars];
  } catch {
    return null;
  }
}
