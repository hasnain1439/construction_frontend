"use client";

import { useCallback } from "react";
import { useLanguage } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatQty, unitLabel } from "@/lib/quantity";

/**
 * A quantity with its unit in the UI language as one bidi island (formatQty): an Urdu page shows
 * "-155.687 مکعب فٹ" (signed number LTR, Urdu unit after it) and never "cft 155.687-" (QA-B-04 /
 * QA-A-10). `null` → "—".
 */
export function QtyText({ value, unit, className }: { value: number | string | null | undefined; unit?: string | null; className?: string }) {
  const language = useLanguage();
  return <span className={cn("tabular whitespace-nowrap", className)}>{formatQty(value, unit, language)}</span>;
}

/**
 * Unit of measure in the UI language (QA-B-24 / QA-A-10): English plurals ("10 bags", "1 no."),
 * Roman Urdu / Urdu words for the common units ("10 بوری"); a unit typed by hand stays as typed.
 * `n = 1` gives the per-unit form ("Rs 1,450 / bag").
 */
export function useUnitLabel() {
  const language = useLanguage();
  return useCallback((unit: string | null | undefined, n: number) => (unit ? unitLabel(unit, n, language) : ""), [language]);
}

/** "10 bags" / "10 بوری" — same as QtyText (kept for callers that pass `quantity`). */
export function QtyUnitText({ quantity, unit, className }: { quantity: number | string; unit?: string | null; className?: string }) {
  return <QtyText value={quantity} unit={unit} className={className} />;
}
