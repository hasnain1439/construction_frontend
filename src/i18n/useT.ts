"use client";

import { useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import type { UiLanguage } from "@/store/slices/uiSlice";
import { en, type Dictionary } from "./en";
import { romanUr } from "./roman-ur";

const DICTIONARIES: Record<UiLanguage, Dictionary> = { en, "roman-ur": romanUr };

type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every translatable key, e.g. "common.save" | "shell.logout". */
export type TranslationKey = Leaves<Dictionary>;

export function translate(language: UiLanguage, key: TranslationKey): string {
  let node: unknown = DICTIONARIES[language];
  for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  if (typeof node === "string") return node;
  // Fall back to English, then to the key itself (never crash on a missing string).
  let fallback: unknown = en;
  for (const part of key.split(".")) fallback = (fallback as Record<string, unknown> | undefined)?.[part];
  return typeof fallback === "string" ? fallback : key;
}

/** Bilingual label used by navigation config and other static lists. */
export interface Label {
  en: string;
  ur: string;
}

export function pickLabel(label: Label, language: UiLanguage): string {
  return language === "roman-ur" ? label.ur : label.en;
}

/** `const t = useT(); t("common.save")` — reads the current UI language from the store. */
export function useT() {
  const language = useAppSelector((state) => state.ui.language);
  return useCallback((key: TranslationKey) => translate(language, key), [language]);
}

export function useLanguage(): UiLanguage {
  return useAppSelector((state) => state.ui.language);
}
