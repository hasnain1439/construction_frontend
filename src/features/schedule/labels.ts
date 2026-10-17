"use client";

import { useCallback } from "react";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";

/**
 * A milestone's name in the UI language: generated milestones (`templateKey` set) are translated,
 * renamed or custom ones show the stored name (QA-B-26; also covers QA-A-10). The single mechanism for
 * milestone names: keys live in enum.milestoneTemplate (en / roman-ur / ur).
 */
export function useMilestoneName() {
  const te = useEnumT();
  return useCallback(
    (m: { name: string; templateKey?: string | null }) => (m.templateKey ? te("milestoneTemplate", m.templateKey, m.name) : m.name),
    [te],
  );
}

/** "+3 days" / "2 days early" / "No change" for a calendar-day shift. */
export function useDayShift() {
  const t = useT();
  return useCallback(
    (days: number) =>
      days > 0
        ? t("schedule.common.later", { n: days })
        : days < 0
          ? t("schedule.common.earlier", { n: -days })
          : t("schedule.common.same"),
    [t],
  );
}

/** "7 Oct 2026 – 8 Oct 2026", or one date when both are the same. */
export function useDateRange() {
  const t = useT();
  return useCallback(
    (from: string, to: string) =>
      from === to
        ? formatDate(from)
        : t("schedule.common.range", { from: formatDate(from), to: formatDate(to) }),
    [t],
  );
}

/** Generate / re-plan are allowed on DRAFT and ACTIVE projects only (409 PROJECT_LOCKED otherwise). */
export const PLAN_EDITABLE = ["DRAFT", "ACTIVE"];
