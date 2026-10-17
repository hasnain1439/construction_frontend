"use client";

import { useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import type { UiLanguage } from "@/store/slices/uiSlice";
import { statusMeta, type StatusDomain } from "@/lib/status";
import { en, type Dictionary } from "./en";
import { romanUr } from "./roman-ur";
import { ur } from "./ur";
import { decodeMsg } from "./message";
import { EN_SINGULAR } from "./plurals";

const DICTIONARIES: Record<UiLanguage, Dictionary> = { en, "roman-ur": romanUr, ur };

/** Never undefined: an unexpected language value (bad stored preference) reads English. */
const dictionaryOf = (language: UiLanguage): Dictionary => DICTIONARIES[language] ?? en;

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every translatable key, e.g. "common.save" | "shell.logout". */
export type TranslationKey = Leaves<Dictionary>;

/** Values for `{name}` placeholders, e.g. `t("dashboard.atRisk", { n: 2 })`. */
export type TranslationVars = Record<string, string | number>;

const fill = (text: string, vars?: TranslationVars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;

const lookup = (dict: Dictionary, key: string): string | undefined => {
  let node: unknown = dict;
  for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  return typeof node === "string" ? node : undefined;
};

/** True when `text` is a dictionary key ("field.amount"). */
export const isTranslationKey = (text: string): text is TranslationKey => /^[a-z]\w*(\.[\w-]+)+$/.test(text) && lookup(en, text) !== undefined;

export function translate(language: UiLanguage, key: TranslationKey, vars?: TranslationVars): string {
  if (language === "en" && vars && Number(vars.n) === 1) {
    const singular = EN_SINGULAR[key];
    if (singular !== undefined) return fill(singular, vars);
  }
  const own = lookup(dictionaryOf(language), key);
  if (own !== undefined) return fill(own, vars);
  // Fall back to English, then to the key itself (never crash on a missing string).
  const fallback = lookup(en, key);
  return fallback !== undefined ? fill(fallback, vars) : key;
}

/**
 * Text of a message that may come from `msg()` (zod schemas, helpers) or be a bare dictionary key;
 * anything else is returned as it is. Values that are dictionary keys are translated as well.
 */
export function translateMessage(language: UiLanguage, message: string): string {
  const decoded = decodeMsg(message);
  if (!decoded) return isTranslationKey(message) ? translate(language, message) : message;
  const [key, vars] = decoded;
  const filled = vars
    ? Object.fromEntries(Object.entries(vars).map(([name, value]) => [name, typeof value === "string" && isTranslationKey(value) ? translate(language, value) : value]))
    : undefined;
  return translate(language, key, filled);
}

/** Fixed enum value lists that have translations (`enum.*` in the dictionaries). */
export type EnumGroup = keyof Dictionary["enum"];

/** Label of an enum value (project status, payment method …); `fallback` (or the raw value) when unknown. */
export function translateEnum(language: UiLanguage, group: EnumGroup, value: string | null | undefined, fallback?: string): string {
  const key = value ?? "";
  const own = (dictionaryOf(language).enum[group] as Record<string, string>)[key];
  const english = (en.enum[group] as Record<string, string>)[key];
  return own ?? english ?? fallback ?? key;
}

/** Status badge label (`status.<domain>.<VALUE>`); `fallback` when the value has no translation. */
export function translateStatus(language: UiLanguage, domain: string, value: string, fallback: string): string {
  const key = `status.${domain}.${value}`;
  return lookup(dictionaryOf(language), key) ?? lookup(en, key) ?? fallback;
}

/** Label used by navigation config and other static lists: English, Roman Urdu (`ur`) and Urdu script. */
export interface Label {
  en: string;
  /** Roman Urdu. */
  ur: string;
  /** Urdu script; Roman Urdu is shown until a label has one. */
  urdu?: string;
}

export function pickLabel(label: Label, language: UiLanguage): string {
  if (language === "ur") return label.urdu ?? label.ur;
  return language === "roman-ur" ? label.ur : label.en;
}

/** Urdu is written right-to-left. */
export const isRtl = (language: UiLanguage) => language === "ur";

/** `const t = useT(); t("common.save")` — reads the current UI language from the store. */
export function useT() {
  const language = useAppSelector((state) => state.ui.language);
  return useCallback((key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars), [language]);
}

/** `const te = useEnumT(); te("projectStatus", "ACTIVE")`. */
export function useEnumT() {
  const language = useAppSelector((state) => state.ui.language);
  return useCallback(
    (group: EnumGroup, value: string | null | undefined, fallback?: string) => translateEnum(language, group, value, fallback),
    [language],
  );
}

/** `const tm = useMessageT(); tm(error.message)` — for texts that may come from `msg()`. */
export function useMessageT() {
  const language = useAppSelector((state) => state.ui.language);
  return useCallback((message: string) => translateMessage(language, message), [language]);
}

/** `const ts = useStatusT(); ts("project", "ACTIVE")` — the status badge label in the current language. */
export function useStatusT() {
  const language = useAppSelector((state) => state.ui.language);
  return useCallback(
    (domain: StatusDomain, value: string | boolean | null | undefined) => translateStatus(language, domain, String(value), statusMeta(domain, value).label),
    [language],
  );
}

export function useLanguage(): UiLanguage {
  return useAppSelector((state) => state.ui.language);
}
