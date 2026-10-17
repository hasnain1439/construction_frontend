"use client";

import { useCallback } from "react";
import { translateEnum, useLanguage } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatQty, unitLabel } from "@/lib/quantity";

/** Left-to-right isolate marks: keep "-155.687 cft" in order inside Urdu (RTL) text. */
export const ltrIsolate = (text: string) => `⁦${text}⁩`;

/**
 * A quantity with its unit as an LTR island, so an Urdu page shows "-155.687 cft"
 * and not "cft 155.687-" (QA-B-04). `null` → "—".
 */
export function QtyText({ value, unit, className }: { value: number | string | null | undefined; unit?: string; className?: string }) {
  return (
    <bdi dir="ltr" className={cn("tabular whitespace-nowrap", className)}>
      {formatQty(value, unit)}
    </bdi>
  );
}

/**
 * Unit of measure in the UI language (QA-B-24): English plurals ("10 bags"), Roman Urdu / Urdu
 * words for the common units ("10 بوری"); a unit typed by hand stays as typed.
 */
export function useUnitLabel() {
  const language = useLanguage();
  return useCallback(
    (unit: string | null | undefined, n: number) => {
      if (!unit) return "";
      if (language === "en") return unitLabel(unit, n);
      return translateEnum(language, "measureUnit", unit.trim().toLowerCase(), unit);
    },
    [language],
  );
}

/** "10 bags" / "10 بوری" — reads in the page direction (no forced LTR, the Urdu word follows the number). */
export function QtyUnitText({ quantity, unit, className }: { quantity: number | string; unit?: string | null; className?: string }) {
  const label = useUnitLabel();
  const n = Number(quantity);
  return <bdi className={cn("tabular whitespace-nowrap", className)}>{`${formatQty(quantity)}${unit ? ` ${label(unit, n)}` : ""}`}</bdi>;
}
