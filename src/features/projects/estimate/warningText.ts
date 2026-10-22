"use client";

import type { BoqAssumption, EstimateWarning } from "@/api/types";
import { hasAllVars, isTranslationKey, useEnumT, useLanguage, useT } from "@/i18n/useT";

/** What a warning carries: the estimate's, the BoQ's and a quote's warnings all fit. */
export interface WarningLike {
  code: string;
  message: string;
  params?: Record<string, number>;
  floor?: EstimateWarning["floor"];
  materials?: readonly string[];
  items?: readonly string[];
}

/**
 * QE4: rooms under 50 % of the covered area → the API produces no estimate (`blockedBy`,
 * blocking warning ROOMS_TOO_FEW). Screens show a clear message instead of the numbers.
 */
export function isEstimateBlocked(e: { blockedBy?: string | null; warnings?: readonly WarningLike[] } | null | undefined): boolean {
  if (!e) return false;
  return e.blockedBy === "ROOMS_TOO_FEW" || Boolean(e.warnings?.some((w) => w.code === "ROOMS_TOO_FEW"));
}

type AssumptionLabels = Pick<BoqAssumption, "key" | "label" | "labelRoman" | "labelUrdu">;

/**
 * An estimate / BoQ / quote warning in the UI language from its `code` + `params` / `materials` /
 * `items` (QA-A-10) — the API's English `message` only for a code the app doesn't know.
 * `assumptions` (the BoQ's rulebook keys with their labels) name the rates of RULEBOOK_RATE_ZERO.
 */
export function useEstimateWarningText(assumptions?: readonly AssumptionLabels[]) {
  const t = useT();
  const te = useEnumT();
  const language = useLanguage();
  const keyText = (a: string, b: string, raw: string) => (isTranslationKey(a) ? t(a) : isTranslationKey(b) ? t(b) : raw);
  const rateKeyText = (key: string) => {
    const a = assumptions?.find((x) => x.key === key);
    if (!a) return key;
    return (language === "ur" ? a.labelUrdu : language === "roman-ur" ? a.labelRoman : a.label) || a.label;
  };
  return (w: WarningLike) => {
    const key = `projects.estimate.warn.${w.code}`;
    if (!isTranslationKey(key)) return w.message;
    const vars = {
      ...w.params,
      floor: w.floor ? te("projectFloorLevel", w.floor.level, w.floor.name) : "",
      // The BoQ's RATES_MISSING lists material keys in `items`.
      materials: (w.materials ?? (w.code === "RATES_MISSING" ? w.items : undefined) ?? []).map((m) => keyText(`projects.estimate.material.${m}`, `estimates.material.${m}`, m)).join(", "),
      // RULEBOOK_RATE_ZERO lists rulebook rate keys; the others labour items
      items: (w.items ?? [])
        .map((i) => (w.code === "RULEBOOK_RATE_ZERO" ? rateKeyText(i) : keyText(`projects.estimate.labour.item.${i}`, `estimates.item.${i}`, i)))
        .join(", "),
    };
    // R1-N1: a warning stored before params existed (old quotes) has only code + message — show the
    // stored message rather than a sentence with "{actual}" or an empty list.
    if (!hasAllVars(key, vars)) return w.message?.trim() ? w.message : t(key, vars);
    return t(key, vars);
  };
}
