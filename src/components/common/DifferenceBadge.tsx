"use client";

import { CircleCheck, CircleX, PackagePlus, TriangleAlert } from "lucide-react";
import type { ComparisonResult } from "@/api/types";
import { useT } from "@/i18n/useT";
import { formatSignedQty } from "@/lib/quantity";
import { StatusBadge } from "./StatusBadge";

/** Same rule as the backend's comparison: short wins, then damaged, then excess. */
export function differenceResult(expected: number, counted: number, damaged = 0): ComparisonResult {
  const short = counted < expected;
  if (short && damaged > 0) return "SHORT_AND_DAMAGED";
  if (short) return "SHORT";
  if (damaged > 0) return "DAMAGED";
  if (counted > expected) return "EXCESS";
  return "COMPLETE";
}

const META = {
  COMPLETE: { tone: "success", labelKey: "app.components.difference.complete", icon: CircleCheck },
  SHORT: { tone: "warning", labelKey: "app.components.difference.short", icon: TriangleAlert },
  DAMAGED: { tone: "danger", labelKey: "app.components.difference.damaged", icon: CircleX },
  SHORT_AND_DAMAGED: { tone: "danger", labelKey: "app.components.difference.shortDamaged", icon: CircleX },
  EXCESS: { tone: "info", labelKey: "app.components.difference.excess", icon: PackagePlus },
} as const;

/**
 * Received vs sent at a glance: complete / short / damaged / excess, with the difference
 * ("-10 bags"). Pass `result` from the API, or `expected` + `counted` (+ `damaged`).
 */
export function DifferenceBadge({
  result,
  expected,
  counted,
  damaged = 0,
  difference,
  unit,
  className,
}: {
  result?: ComparisonResult;
  expected?: number;
  counted?: number;
  damaged?: number;
  /** Good quantity − expected; computed from the numbers when omitted. */
  difference?: number | null;
  unit?: string;
  className?: string;
}) {
  const t = useT();
  const r = result ?? (expected !== undefined && counted !== undefined ? differenceResult(expected, counted, damaged) : "COMPLETE");
  const meta = META[r];
  const diff = difference ?? (expected !== undefined && counted !== undefined ? counted - damaged - expected : null);
  const label = r === "COMPLETE" || diff === null || diff === 0 ? t(meta.labelKey) : `${t(meta.labelKey)} · ${formatSignedQty(diff, unit)}`;
  return <StatusBadge tone={meta.tone} label={label} icon={meta.icon} className={className} />;
}
