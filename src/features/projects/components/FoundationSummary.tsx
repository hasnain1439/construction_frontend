"use client";

import type { ProjectFoundation } from "@/api/types";
import { InfoList, type InfoItem } from "@/components/common/InfoList";
import { useEnumT, useT } from "@/i18n/useT";
import { barName, hasPads, isPile, rccApplies } from "../utils/foundation";

/** Label / value rows of a saved foundation; rows that don't apply to its type are left out. */
export function useFoundationItems(f: ProjectFoundation): InfoItem[] {
  const t = useT();
  const te = useEnumT();
  const rcc = rccApplies(f.type, f.masonry);
  const soil = [
    f.soilType ? te("projectSoilType", f.soilType) : null,
    f.waterTableDepthFt !== null ? t("projects.foundation.waterTableValue", { n: f.waterTableDepthFt }) : null,
    f.dewateringNeeded ? t("projects.foundation.dewateringShort") : null,
    f.soilTestDone ? t("projects.foundation.soilTestShort") : null,
  ].filter(Boolean);
  return [
    { label: t("projects.foundation.type"), value: te("projectFoundationType", f.type) },
    {
      label: t("projects.foundation.depthThickness"),
      value: <bdi>{t("projects.foundation.depthThicknessValue", { depth: f.excavationDepthFt, thickness: f.footingThicknessIn })}</bdi>,
    },
    {
      label: t("projects.foundation.footingWidth"),
      value: t("projects.foundation.stripValue", { width: f.footingWidthFt ?? "—" }),
      hidden: f.type !== "STRIP",
    },
    {
      label: t("projects.foundation.footings"),
      value: <bdi>{t("projects.foundation.footingsValue", { count: f.footingCount ?? "—", length: f.footingLengthFt ?? "—", width: f.footingWidthFt ?? "—" })}</bdi>,
      hidden: !hasPads(f.type),
    },
    {
      label: t("projects.foundation.piles"),
      value: <bdi>{t("projects.foundation.pilesValue", { count: f.pileCount ?? "—", diameter: f.pileDiameterIn ?? "—", depth: f.pileDepthFt ?? "—" })}</bdi>,
      hidden: !isPile(f.type),
    },
    { label: t("projects.foundation.plinthDpc"), value: <bdi>{t("projects.foundation.plinthDpcValue", { plinth: f.plinthHeightFt, dpc: f.dpcThicknessIn })}</bdi> },
    { label: t("projects.foundation.masonry"), value: te("projectFoundationMasonry", f.masonry) },
    { label: t("projects.foundation.pcc"), value: <bdi>{t("projects.foundation.pccValue", { mix: f.pccMix, thickness: f.pccThicknessIn })}</bdi> },
    {
      label: t("projects.foundation.rcc"),
      value: (
        <bdi>
          {t("projects.foundation.rccValue", {
            mix: f.rccMix ?? "—",
            bar: f.mainBarMm ? t("projects.foundation.barValue", { bar: barName(f.mainBarMm), mm: f.mainBarMm }) : "—",
          })}
        </bdi>
      ),
      hidden: !rcc,
    },
    { label: t("projects.foundation.dpcMaterial"), value: te("projectDpcMaterial", f.dpcMaterial) },
    { label: t("projects.foundation.termite"), value: f.termiteTreatment ? t("common.yes") : t("common.no") },
    { label: t("projects.foundation.soilSite"), value: soil.length ? soil.join(" · ") : "—" },
    { label: t("projects.foundation.soilTestNote"), value: f.soilTestNote, hidden: !f.soilTestNote },
    { label: t("projects.foundation.notes"), value: f.notes, hidden: !f.notes },
  ];
}

function FoundationList({ foundation }: { foundation: ProjectFoundation }) {
  return <InfoList items={useFoundationItems(foundation)} />;
}

/** Saved foundation as a label / value list, or "Not entered yet" (projects from before the field). */
export function FoundationSummary({ foundation }: { foundation: ProjectFoundation | null | undefined }) {
  const t = useT();
  if (!foundation) return <p className="text-sm text-muted-foreground">{t("projects.foundation.notEntered")}</p>;
  return <FoundationList foundation={foundation} />;
}
