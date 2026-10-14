"use client";

import { useCallback } from "react";
import { useT, type TranslationKey } from "@/i18n/useT";

type Unit = "second" | "minute" | "hour" | "day" | "month" | "year";

const UNITS: [Unit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

const LIMITS: Record<Unit, number> = { second: 60, minute: 60, hour: 24, day: 30, month: 12, year: Infinity };

/** Biggest whole unit for `seconds` (same steps as date-fns `formatDistanceStrict`). */
function pickUnit(seconds: number): [Unit, number] {
  for (let i = UNITS.length - 1; i >= 0; i -= 1) {
    const [unit, size] = UNITS[i];
    const n = Math.round(seconds / size);
    if (n < LIMITS[unit]) return [unit, n];
  }
  return ["year", Math.round(seconds / UNITS[0][1])];
}

const toDate = (value: string | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** `const rel = useRelativeTime(); rel(createdAt)` → "3 days ago" / "in 2 hours", in the current language. */
export function useRelativeTime() {
  const t = useT();
  return useCallback(
    (value: string | Date | null | undefined, fallback = "—") => {
      const date = value ? toDate(value) : null;
      if (!date) return fallback;
      const diff = (date.getTime() - Date.now()) / 1000;
      const [unit, n] = pickUnit(Math.abs(diff));
      const plural = n === 1 ? "One" : "N";
      const key = `app.time.${diff > 0 ? "in" : "ago"}${plural}${unit[0].toUpperCase()}${unit.slice(1)}` as TranslationKey;
      return t(key, { n });
    },
    [t],
  );
}
