"use client";

import { useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import type { UiLanguage } from "@/store/slices/uiSlice";
import { en, type Dictionary } from "./en";
import { romanUr } from "./roman-ur";
import { ur } from "./ur";

const DICTIONARIES: Record<UiLanguage, Dictionary> = { en, "roman-ur": romanUr, ur };

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every translatable key, e.g. "common.save" | "shell.logout". */
export type TranslationKey = Leaves<Dictionary>;

/** Values for `{name}` placeholders, e.g. `t("dashboard.atRisk", { n: 2 })`. */
export type TranslationVars = Record<string, string | number>;

const fill = (text: string, vars?: TranslationVars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;

export function translate(language: UiLanguage, key: TranslationKey, vars?: TranslationVars): string {
  let node: unknown = DICTIONARIES[language];
  for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  if (typeof node === "string") return fill(node, vars);
  // Fall back to English, then to the key itself (never crash on a missing string).
  let fallback: unknown = en;
  for (const part of key.split(".")) fallback = (fallback as Record<string, unknown> | undefined)?.[part];
  return typeof fallback === "string" ? fill(fallback, vars) : key;
}

/** Fixed enum value lists that have translations (`enum.*` in the dictionaries). */
export type EnumGroup = keyof Dictionary["enum"];

/** Label of an enum value (project status, payment method …); `fallback` (or the raw value) when unknown. */
export function translateEnum(language: UiLanguage, group: EnumGroup, value: string | null | undefined, fallback?: string): string {
  const key = value ?? "";
  const own = (DICTIONARIES[language].enum[group] as Record<string, string>)[key];
  const english = (en.enum[group] as Record<string, string>)[key];
  return own ?? english ?? fallback ?? key;
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

export function useLanguage(): UiLanguage {
  return useAppSelector((state) => state.ui.language);
}
