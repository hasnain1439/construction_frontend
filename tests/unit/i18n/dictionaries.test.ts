/**
 * Every page must be fully in Roman Urdu and Urdu: English (src/i18n/en.ts) is the source of every
 * key, and roman-ur / ur must have exactly the same keys, no empty texts, the same {placeholders},
 * and Urdu must really be Urdu (no English left in it, apart from a few allowed brand words / units).
 */
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { romanUr } from "@/i18n/roman-ur";
import { ur } from "@/i18n/ur";
import { translate, type TranslationKey } from "@/i18n/useT";

/** Latin words that may stay in Urdu text (brands, units and abbreviations people read as they are). */
const URDU_ALLOWED_LATIN = ["Rs", "PKR", "kg", "OTP", "PDF", "SMS", "CSV", "Excel", "xlsx", "csv", "WhatsApp", "OT", "BoQ", "IBFT", "NTN", "CNIC", "Ctrl", "K", "MB", "v"];

/** Every text of a nested dictionary as "a.b.c" → text. */
function flatten(node: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) flatten(value, prefix ? `${prefix}.${key}` : key, out);
  } else out[prefix] = node;
  return out;
}

const EN = flatten(en);
const EN_KEYS = Object.keys(EN).sort();
const DICTS = { "roman-ur": flatten(romanUr), ur: flatten(ur) } as const;

const placeholders = (s: unknown) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const latinLeft = (s: unknown) =>
  URDU_ALLOWED_LATIN.reduce((rest, word) => rest.replace(new RegExp(`\\b${word}\\b`, "g"), ""), String(s).replace(/\{\w+\}/g, "")).match(/[A-Za-z]+/g) ?? [];

describe("dictionaries", () => {
  it("has a few thousand English texts", () => {
    expect(EN_KEYS.length).toBeGreaterThan(500);
  });

  it.each(Object.entries(DICTS))("%s has every English key and no extra keys", (_name, dict) => {
    const missing = EN_KEYS.filter((k) => !(k in dict));
    const extra = Object.keys(dict).filter((k) => !(k in EN));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each([["en", EN] as const, ...Object.entries(DICTS)])("%s has no empty texts", (_name, dict) => {
    const empty = Object.entries(dict)
      .filter(([, v]) => typeof v !== "string" || !v.trim())
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it.each(Object.entries(DICTS))("%s keeps the same {placeholders} as English", (_name, dict) => {
    const wrong = EN_KEYS.filter((k) => k in dict && placeholders(dict[k]).join() !== placeholders(EN[k]).join());
    expect(wrong).toEqual([]);
  });

  it("Urdu is not English: no text copied from English, no Latin words except the allowed ones", () => {
    const copied = EN_KEYS.filter((k) => DICTS.ur[k] === EN[k] && latinLeft(EN[k]).length > 0);
    const latin = EN_KEYS.filter((k) => latinLeft(DICTS.ur[k]).length > 0).map((k) => `${k}: ${latinLeft(DICTS.ur[k]).join(" ")}`);
    expect({ copied, latin }).toEqual({ copied: [], latin: [] });
  });

  it("translate never falls back: every language returns its own text", () => {
    for (const key of EN_KEYS) {
      // `enum.*` groups are read with translateEnum; the rest with translate.
      if (key.startsWith("enum.")) continue;
      expect(translate("ur", key as TranslationKey)).toBe(DICTS.ur[key]);
      expect(translate("roman-ur", key as TranslationKey)).toBe(DICTS["roman-ur"][key]);
    }
  });
});
