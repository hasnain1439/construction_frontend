import { afterEach, describe, expect, it, vi } from "vitest";
import type { MeWithPreferences } from "@/api/types";
import {
  accountLanguage,
  disablePreferenceSync,
  fromServerLanguage,
  hasLocalLanguageChoice,
  isMissingEndpoint,
  LANGUAGE_CHOSEN_KEY,
  languageAfterLogin,
  markLanguageChosen,
  preferenceSyncDisabled,
  resetPreferenceSync,
  toServerLanguage,
} from "@/lib/languagePreference";

const me = (extra: Partial<MeWithPreferences> & { userLanguage?: string }) =>
  ({ user: { language: extra.userLanguage ?? "ENGLISH" }, language: extra.language }) as unknown as MeWithPreferences;

afterEach(() => {
  window.localStorage.clear();
  resetPreferenceSync();
  vi.restoreAllMocks();
});

describe("language codes", () => {
  it("maps the UI codes to the API codes and back", () => {
    expect(toServerLanguage("en")).toBe("en");
    expect(toServerLanguage("roman-ur")).toBe("roman");
    expect(toServerLanguage("ur")).toBe("ur");
    expect(fromServerLanguage("roman")).toBe("roman-ur");
    expect(fromServerLanguage("ROMAN_URDU")).toBe("roman-ur");
    expect(fromServerLanguage("URDU")).toBe("ur");
    expect(fromServerLanguage("fr")).toBeNull();
    expect(fromServerLanguage(undefined)).toBeNull();
  });

  it("reads the new top-level language first, then user.language", () => {
    expect(accountLanguage(me({ language: "ur", userLanguage: "ENGLISH" }))).toBe("ur");
    expect(accountLanguage(me({ userLanguage: "ROMAN_URDU" }))).toBe("roman-ur");
    expect(accountLanguage(null)).toBeNull();
  });
});

describe("after sign-in", () => {
  it("adopts the account language when the browser has no choice", () => {
    expect(languageAfterLogin(me({ language: "ur" }), "en", false)).toBe("ur");
    expect(languageAfterLogin(me({ language: "en" }), "en", false)).toBeNull();
  });

  it("keeps the browser's own choice", () => {
    expect(languageAfterLogin(me({ language: "ur" }), "roman-ur", true)).toBeNull();
  });

  it("a choice is the LanguageMenu flag or a stored non-English language", () => {
    expect(hasLocalLanguageChoice()).toBe(false);
    window.localStorage.setItem("cw.ui", JSON.stringify({ language: "en" }));
    expect(hasLocalLanguageChoice()).toBe(false);
    window.localStorage.setItem("cw.ui", JSON.stringify({ language: "ur" }));
    expect(hasLocalLanguageChoice()).toBe(true);
    window.localStorage.setItem("cw.ui", JSON.stringify({ language: "en" }));
    markLanguageChosen();
    expect(window.localStorage.getItem(LANGUAGE_CHOSEN_KEY)).toBe("1");
    expect(hasLocalLanguageChoice()).toBe(true);
  });
});

describe("missing endpoint guard", () => {
  it("404 / 405 switch saving off for the tab; other errors don't", () => {
    expect(isMissingEndpoint({ status: 404 })).toBe(true);
    expect(isMissingEndpoint({ status: 405 })).toBe(true);
    expect(isMissingEndpoint({ status: 500 })).toBe(false);
    expect(preferenceSyncDisabled()).toBe(false);
    disablePreferenceSync();
    expect(preferenceSyncDisabled()).toBe(true);
  });
});
