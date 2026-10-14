/**
 * The UI language follows the person across devices: the account keeps a language
 * (GET /auth/me → `language`, PATCH /auth/me/preferences), the browser keeps its own choice.
 *
 * - Picking a language in LanguageMenu saves it in the browser and on the account.
 * - After sign-in, the account's language is used only when this browser has no choice of its own.
 * - An API without the preference endpoint (404 / 405) is remembered for the tab and never called again.
 */
import type { MeWithPreferences, PreferenceLanguage } from "@/api/types";
import type { UiLanguage } from "@/store/slices/uiSlice";

/** Set once the person has picked a language in this browser (LanguageMenu). */
export const LANGUAGE_CHOSEN_KEY = "cw.languageChosen";
/** Where StoreProvider keeps the UI preferences (language among them). */
const UI_STORAGE_KEY = "cw.ui";

const TO_SERVER: Record<UiLanguage, PreferenceLanguage> = { en: "en", "roman-ur": "roman", ur: "ur" };

/** Every spelling the API may use: the preference codes and the older `user.language` enum. */
const FROM_SERVER: Record<string, UiLanguage> = {
  en: "en",
  roman: "roman-ur",
  "roman-ur": "roman-ur",
  ur: "ur",
  ENGLISH: "en",
  ROMAN_URDU: "roman-ur",
  URDU: "ur",
};

export const toServerLanguage = (language: UiLanguage): PreferenceLanguage => TO_SERVER[language];

export function fromServerLanguage(value: unknown): UiLanguage | null {
  return typeof value === "string" ? (FROM_SERVER[value] ?? null) : null;
}

/** The account's language from /auth/me: the new top-level `language`, else `user.language`. */
export function accountLanguage(me: MeWithPreferences | undefined | null): UiLanguage | null {
  if (!me) return null;
  return fromServerLanguage(me.language) ?? fromServerLanguage(me.user?.language);
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function markLanguageChosen() {
  try {
    storage()?.setItem(LANGUAGE_CHOSEN_KEY, "1");
  } catch {
    // Private mode: the choice lasts for the tab.
  }
}

/**
 * True when this browser already has a language of its own: picked in LanguageMenu, or (for
 * browsers from before the flag existed) a stored language other than the English default.
 */
export function hasLocalLanguageChoice(): boolean {
  const store = storage();
  if (!store) return false;
  try {
    if (store.getItem(LANGUAGE_CHOSEN_KEY) === "1") return true;
    const raw = store.getItem(UI_STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as { language?: unknown }).language : undefined;
    return typeof stored === "string" && stored !== "en";
  } catch {
    return false;
  }
}

/** The language to switch to after sign-in, or null to keep the current one. */
export function languageAfterLogin(me: MeWithPreferences | undefined | null, current: UiLanguage, hasLocalChoice = hasLocalLanguageChoice()): UiLanguage | null {
  if (hasLocalChoice) return null;
  const fromAccount = accountLanguage(me);
  return fromAccount && fromAccount !== current ? fromAccount : null;
}

let preferenceEndpointMissing = false;

/** The API answered 404 / 405 to PATCH /auth/me/preferences: stop calling it for this tab. */
export function isMissingEndpoint(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 404 || status === 405;
}

export const preferenceSyncDisabled = () => preferenceEndpointMissing;
export function disablePreferenceSync() {
  preferenceEndpointMissing = true;
}
/** Tests only. */
export function resetPreferenceSync() {
  preferenceEndpointMissing = false;
}
