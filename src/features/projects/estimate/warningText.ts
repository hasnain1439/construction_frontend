"use client";

import type { EstimateWarning } from "@/api/types";
import { isTranslationKey, useEnumT, useT } from "@/i18n/useT";

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
 * An estimate / BoQ / quote warning in the UI language from its `code` + `params` / `materials` /
 * `items` (QA-A-10) — the API's English `message` only for a code the app doesn't know.
 */
export function useEstimateWarningText() {
  const t = useT();
  const te = useEnumT();
  const keyText = (a: string, b: string, raw: string) => (isTranslationKey(a) ? t(a) : isTranslationKey(b) ? t(b) : raw);
  return (w: WarningLike) => {
    const key = `projects.estimate.warn.${w.code}`;
    if (!isTranslationKey(key)) return w.message;
    const vars = {
      ...w.params,
      floor: w.floor ? te("projectFloorLevel", w.floor.level, w.floor.name) : "",
      // The BoQ's RATES_MISSING lists material keys in `items`.
      materials: (w.materials ?? (w.code === "RATES_MISSING" ? w.items : undefined) ?? []).map((m) => keyText(`projects.estimate.material.${m}`, `estimates.material.${m}`, m)).join(", "),
      items: (w.items ?? []).map((i) => keyText(`projects.estimate.labour.item.${i}`, `estimates.item.${i}`, i)).join(", "),
    };
    return t(key, vars);
  };
}
