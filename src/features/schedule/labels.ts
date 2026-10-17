"use client";

import { useCallback } from "react";
import { isTranslationKey, translate, translateEnum, useEnumT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";

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

const FLOOR_OF_STAGE: Record<string, string> = { GF_STRUCTURE: "GROUND", F1_STRUCTURE: "FIRST", F2_STRUCTURE: "SECOND", F3_STRUCTURE: "THIRD" };

/**
 * A generated milestone's name in the UI language (QA-A-10), from its key ("GF_STRUCTURE.WALLS" →
 * "{floor} — columns & brickwork"). The API stores the English name; a milestone whose name differs
 * from the English default (renamed) keeps its own name.
 */
export function useMilestoneName() {
  const t = useT();
  const te = useEnumT();
  return useCallback(
    (m: { key: string; name: string }) => {
      const [stageKey = "", suffix] = m.key.split(".");
      const key = `schedule.milestoneName.${suffix ?? ""}`;
      if (!suffix || !isTranslationKey(key)) return m.name;
      const level = FLOOR_OF_STAGE[stageKey];
      if (translate("en", key, { floor: level ? translateEnum("en", "projectFloorLevel", level) : "" }) !== m.name) return m.name;
      return t(key, { floor: level ? te("projectFloorLevel", level) : "" });
    },
    [t, te],
  );
}
