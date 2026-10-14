"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import type { ProjectDetail } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { DataTable } from "@/components/common/DataTable";
import { InfoList } from "@/components/common/InfoList";
import { MoneyText } from "@/components/common/MoneyText";
import { PercentTotalChip, percentTotal } from "@/components/common/PercentTotalChip";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { SUPPLY_CATEGORIES } from "../constants";
import { formatArea } from "../utils/calc";
import { wizardHref } from "../utils/links";

function EditLink({ project, tab, canEdit }: { project: ProjectDetail; tab: number; canEdit?: boolean }) {
  const t = useT();
  if (!canEdit) return null;
  return (
    <Button asChild variant="ghost" size="sm">
      <Link href={wizardHref(project.id, tab)}>
        <Pencil data-icon="inline-start" />
        {t("common.edit")}
      </Link>
    </Button>
  );
}

/** "12 ft" / "2,250 sq ft" in the current language ("—" when empty). */
function useUnits() {
  const t = useT();
  return {
    ft: (v: number | null | undefined) => (v === null || v === undefined ? "—" : t("projects.unit.ftValue", { n: v })),
    sqft: (v: number | null | undefined) => (v === null || v === undefined ? "—" : t("projects.unit.sqftValue", { n: formatArea(v) })),
  };
}

export function ClientCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const t = useT();
  return (
    <SectionCard title={t("projects.section.clientSite")} actions={<EditLink project={project} tab={1} canEdit={canEdit} />}>
      <InfoList
        items={[
          { label: t("field.client"), value: project.client?.name },
          {
            label: t("field.phone"),
            value: project.client?.phone ? <bdi dir="ltr">{formatPhone(project.client.phone)}</bdi> : undefined,
            hidden: !project.client?.phone,
          },
          { label: t("field.site"), value: [project.siteAddress, project.city].filter(Boolean).join(", ") || "—" },
          { label: t("projects.section.dates"), value: <bdi>{`${formatDate(project.startDate)} – ${formatDate(project.endDate)}`}</bdi> },
        ]}
      />
    </SectionCard>
  );
}

export function ContractCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const t = useT();
  const te = useEnumT();
  const c = project.contract;
  const stages = project.billingStages ?? [];
  return (
    <SectionCard
      title={t("field.contract")}
      actions={
        <>
          {stages.length ? <PercentTotalChip total={percentTotal(stages.map((s) => s.percent))} /> : null}
          <EditLink project={project} tab={2} canEdit={canEdit} />
        </>
      }
    >
      <InfoList
        items={[
          { label: t("projects.section.contractType"), value: c?.contractType ? te("projectContractType", c.contractType) : t("projects.section.notSet") },
          { label: t("projects.section.billing"), value: c?.billingModel ? te("billingModel", c.billingModel) : "—" },
          {
            label: c?.contractType === "LABOR_ONLY" ? t("projects.section.ratePerSqft") : t("projects.section.contractValue"),
            value: <MoneyText paisa={c?.contractType === "LABOR_ONLY" ? c?.ratePerSqftPaisa : c?.contractValuePaisa} />,
          },
          { label: t("projects.section.contractTotal"), value: <MoneyText paisa={c?.contractTotalPaisa} /> },
          {
            label: t("field.retention"),
            value: c ? t("projects.section.retentionValue", { percent: c.retentionPercent, months: c.defectPeriodMonths }) : "—",
          },
          { label: t("projects.section.paymentStages"), value: stages.length || "—" },
        ]}
      />
    </SectionCard>
  );
}

export function PlotCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const t = useT();
  const te = useEnumT();
  const { sqft } = useUnits();
  const p = project.plot;
  const calc = project.calculations;
  return (
    <SectionCard title={t("projects.section.plot")} actions={<EditLink project={project} tab={3} canEdit={canEdit} />}>
      <InfoList
        items={[
          {
            label: t("projects.section.size"),
            value:
              p?.plotUnit && p.plotSize
                ? t("projects.section.plotSizeValue", { size: p.plotSize, unit: te("projectPlotUnit", p.plotUnit), area: sqft(calc?.plotAreaSqft) })
                : t("projects.section.notSet"),
          },
          { label: t("projects.section.marlaStandard"), value: p ? t("projects.unit.sqftValue", { n: p.marlaStandard }) : "—" },
          {
            label: t("projects.section.frontDepth"),
            value:
              p?.frontFt && p.depthFt ? t("projects.section.frontDepthValue", { front: p.frontFt, depth: p.depthFt, area: sqft(calc?.frontageAreaSqft) }) : "—",
          },
          { label: t("projects.section.cornerPlot"), value: p?.cornerPlot ? t("common.yes") : t("common.no") },
        ]}
      />
      {calc?.plotAreaMismatch ? <p className="mt-3 text-xs text-warning">{t("projects.section.plotMismatch")}</p> : null}
    </SectionCard>
  );
}

export function StructureCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const t = useT();
  const te = useEnumT();
  const { ft } = useUnits();
  const s = project.structure;
  return (
    <SectionCard title={t("projects.section.structure")} actions={<EditLink project={project} tab={3} canEdit={canEdit} />}>
      <InfoList
        items={[
          { label: t("field.type"), value: s?.structureType ? te("projectStructureType", s.structureType) : t("projects.section.notSet") },
          {
            label: t("projects.section.basement"),
            value: s?.hasBasement ? t("projects.section.basementYes", { height: ft(s.basementHeightFt) }) : t("common.no"),
          },
          {
            label: t("projects.section.floors"),
            value: project.floors?.length
              ? project.floors
                  .map((f) => t("projects.section.floorWithHeight", { name: te("projectFloorLevel", f.level, f.name), height: f.ceilingHeightFt }))
                  .join(" · ")
              : "—",
          },
        ]}
        columns={1}
      />
    </SectionCard>
  );
}

export function CoverageCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const t = useT();
  const { sqft } = useUnits();
  const c = project.coverage;
  return (
    <SectionCard title={t("projects.section.coverageBoundary")} actions={<EditLink project={project} tab={4} canEdit={canEdit} />}>
      <InfoList
        items={[
          { label: t("projects.section.covered"), value: sqft(c?.coveredAreaSqft) },
          { label: t("projects.section.semiCovered"), value: sqft(c?.semiCoveredSqft) },
          { label: t("projects.section.open"), value: sqft(c?.openAreaSqft) },
          {
            label: t("projects.section.boundaryWall"),
            value: c?.boundaryWall
              ? t("projects.section.boundaryValue", {
                  length: c.boundaryLengthFt ?? "—",
                  height: c.boundaryHeightFt ?? "—",
                  thickness: c.boundaryThickness === "IN_4_5" ? '4.5"' : '9"',
                  sides: c.boundaryPlasterSides === 1 ? t("projects.section.oneSide") : t("projects.section.bothSides"),
                })
              : t("common.no"),
          },
        ]}
      />
    </SectionCard>
  );
}

export function TeamCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const t = useT();
  return (
    <SectionCard title={t("field.team")} actions={<EditLink project={project} tab={1} canEdit={canEdit} />}>
      <div className="space-y-3">
        {project.team.pm ? (
          <AvatarName name={project.team.pm.name} subtitle={t("field.projectManager")} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("projects.section.noPmAssigned")}</p>
        )}
        {project.team.munshis.length ? (
          project.team.munshis.map((m) => <AvatarName key={m.id} name={m.name} subtitle={t("field.munshi")} />)
        ) : (
          <p className="text-sm text-muted-foreground">{t("projects.section.noMunshiAssigned")}</p>
        )}
      </div>
    </SectionCard>
  );
}

export function RoomsSummaryCard({ project, canEdit, title }: { project: ProjectDetail; canEdit?: boolean; title?: string }) {
  const t = useT();
  const te = useEnumT();
  const { sqft } = useUnits();
  const floors = project.floors ?? [];
  const totals = project.calculations;
  return (
    <SectionCard title={title ?? t("projects.section.rooms")} flush actions={<EditLink project={project} tab={5} canEdit={canEdit} />}>
      <DataTable
        rows={floors}
        getRowId={(f) => f.id}
        clientPageSize={0}
        empty={{ title: t("projects.section.noFloors") }}
        columns={[
          { id: "floor", header: t("projects.section.floor"), cell: (f) => <span className="font-medium">{te("projectFloorLevel", f.level, f.name)}</span> },
          { id: "rooms", header: t("projects.section.rooms"), align: "right", cell: (f) => f.calculations.rooms },
          { id: "area", header: t("projects.section.floorArea"), align: "right", cell: (f) => sqft(f.calculations.totalFloorAreaSqft) },
          { id: "wall", header: t("projects.section.netWall"), align: "right", cell: (f) => sqft(f.calculations.netWallAreaSqft) },
          { id: "wet", header: t("projects.section.wetRooms"), align: "right", cell: (f) => f.calculations.wetRooms },
        ]}
      />
      {totals ? (
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          {t("projects.section.roomsTotals", { rooms: totals.rooms, area: sqft(totals.totalFloorAreaSqft), wall: sqft(totals.netWallAreaSqft) })}
        </p>
      ) : null}
    </SectionCard>
  );
}

export function SupplyRulesCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const t = useT();
  const te = useEnumT();
  const rules = project.supplyRules ?? [];
  return (
    <SectionCard title={t("projects.section.whoSupplies")} flush actions={<EditLink project={project} tab={2} canEdit={canEdit} />}>
      <DataTable
        rows={rules}
        getRowId={(r) => r.categoryKey}
        clientPageSize={0}
        empty={{ title: t("projects.section.supplyNotSet"), description: t("projects.section.supplyNotSetDesc") }}
        columns={[
          {
            id: "category",
            header: t("field.category"),
            cell: (r) => (
              <span className="font-medium">
                {SUPPLY_CATEGORIES.some((c) => c.key === r.categoryKey) ? te("projectSupplyCategory", r.categoryKey) : r.label}
              </span>
            ),
          },
          {
            id: "by",
            header: t("projects.section.suppliedBy"),
            cell: (r) => (
              <StatusBadge
                tone={r.suppliedBy === "CONTRACTOR" ? "info" : "neutral"}
                label={r.suppliedBy === "CONTRACTOR" ? t("projects.section.contractor") : t("projects.section.owner")}
              />
            ),
          },
          {
            id: "quality",
            header: t("projects.section.qualityCategory"),
            cell: (r) => r.qualityCategory?.name ?? <span className="text-muted-foreground">—</span>,
          },
          { id: "locked", header: t("projects.section.locked"), cell: (r) => (r.locked ? t("common.yes") : t("common.no")) },
        ]}
      />
    </SectionCard>
  );
}
