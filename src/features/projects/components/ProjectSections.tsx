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
import { formatDate } from "@/lib/dates";
import { BILLING_MODEL_LABEL } from "@/lib/options";
import { formatPhone } from "@/lib/phone";
import { CONTRACT_TYPE_LABEL, PLOT_UNIT_LABEL, STRUCTURE_LABEL, SUPPLY_CATEGORIES } from "../constants";
import { formatArea } from "../utils/calc";
import { wizardHref } from "../utils/links";

function EditLink({ project, tab, canEdit }: { project: ProjectDetail; tab: number; canEdit?: boolean }) {
  if (!canEdit) return null;
  return (
    <Button asChild variant="ghost" size="sm">
      <Link href={wizardHref(project.id, tab)}>
        <Pencil data-icon="inline-start" />
        Edit
      </Link>
    </Button>
  );
}

const ft = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v} ft`);
const sqft = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${formatArea(v)} sq ft`);

export function ClientCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  return (
    <SectionCard title="Client & site" actions={<EditLink project={project} tab={1} canEdit={canEdit} />}>
      <InfoList
        items={[
          { label: "Client", value: project.client?.name },
          { label: "Phone", value: project.client?.phone ? formatPhone(project.client.phone) : undefined, hidden: !project.client?.phone },
          { label: "Site", value: [project.siteAddress, project.city].filter(Boolean).join(", ") || "—" },
          { label: "Dates", value: `${formatDate(project.startDate)} – ${formatDate(project.endDate)}` },
        ]}
      />
    </SectionCard>
  );
}

export function ContractCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const c = project.contract;
  const stages = project.billingStages ?? [];
  return (
    <SectionCard
      title="Contract"
      actions={
        <>
          {stages.length ? <PercentTotalChip total={percentTotal(stages.map((s) => s.percent))} /> : null}
          <EditLink project={project} tab={2} canEdit={canEdit} />
        </>
      }
    >
      <InfoList
        items={[
          { label: "Contract type", value: c?.contractType ? CONTRACT_TYPE_LABEL[c.contractType] : "Not set" },
          { label: "Billing", value: c?.billingModel ? BILLING_MODEL_LABEL[c.billingModel] : "—" },
          {
            label: c?.contractType === "LABOR_ONLY" ? "Rate per sq ft" : "Contract value",
            value: <MoneyText paisa={c?.contractType === "LABOR_ONLY" ? c?.ratePerSqftPaisa : c?.contractValuePaisa} />,
          },
          { label: "Contract total", value: <MoneyText paisa={c?.contractTotalPaisa} /> },
          { label: "Retention", value: c ? `${c.retentionPercent}% · ${c.defectPeriodMonths} months defect period` : "—" },
          { label: "Payment stages", value: stages.length || "—" },
        ]}
      />
    </SectionCard>
  );
}

export function PlotCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const p = project.plot;
  const calc = project.calculations;
  return (
    <SectionCard title="Plot" actions={<EditLink project={project} tab={3} canEdit={canEdit} />}>
      <InfoList
        items={[
          { label: "Size", value: p?.plotUnit && p.plotSize ? `${p.plotSize} ${PLOT_UNIT_LABEL[p.plotUnit]} (${sqft(calc?.plotAreaSqft)})` : "Not set" },
          { label: "Marla standard", value: p ? `${p.marlaStandard} sq ft` : "—" },
          { label: "Front × depth", value: p?.frontFt && p.depthFt ? `${p.frontFt} × ${p.depthFt} ft (${sqft(calc?.frontageAreaSqft)})` : "—" },
          { label: "Corner plot", value: p?.cornerPlot ? "Yes" : "No" },
        ]}
      />
      {calc?.plotAreaMismatch ? <p className="mt-3 text-xs text-warning">Plot size and front × depth differ by more than 10 %.</p> : null}
    </SectionCard>
  );
}

export function StructureCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const s = project.structure;
  return (
    <SectionCard title="Structure" actions={<EditLink project={project} tab={3} canEdit={canEdit} />}>
      <InfoList
        items={[
          { label: "Type", value: s?.structureType ? STRUCTURE_LABEL[s.structureType] : "Not set" },
          { label: "Basement", value: s?.hasBasement ? `Yes · ${ft(s.basementHeightFt)}` : "No" },
          {
            label: "Floors",
            value: project.floors?.length ? project.floors.map((f) => `${f.name} (${f.ceilingHeightFt} ft)`).join(" · ") : "—",
          },
        ]}
        columns={1}
      />
    </SectionCard>
  );
}

export function CoverageCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const c = project.coverage;
  return (
    <SectionCard title="Coverage & boundary" actions={<EditLink project={project} tab={4} canEdit={canEdit} />}>
      <InfoList
        items={[
          { label: "Covered", value: sqft(c?.coveredAreaSqft) },
          { label: "Semi-covered", value: sqft(c?.semiCoveredSqft) },
          { label: "Open", value: sqft(c?.openAreaSqft) },
          {
            label: "Boundary wall",
            value: c?.boundaryWall
              ? `${c.boundaryLengthFt} rft × ${c.boundaryHeightFt} ft · ${c.boundaryThickness === "IN_4_5" ? '4.5"' : '9"'} · plaster ${c.boundaryPlasterSides === 1 ? "one side" : "both sides"}`
              : "No",
          },
        ]}
      />
    </SectionCard>
  );
}

export function TeamCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  return (
    <SectionCard title="Team" actions={<EditLink project={project} tab={1} canEdit={canEdit} />}>
      <div className="space-y-3">
        {project.team.pm ? <AvatarName name={project.team.pm.name} subtitle="Project Manager" /> : <p className="text-sm text-muted-foreground">No PM assigned</p>}
        {project.team.munshis.length ? (
          project.team.munshis.map((m) => <AvatarName key={m.id} name={m.name} subtitle="Munshi" />)
        ) : (
          <p className="text-sm text-muted-foreground">No Munshi assigned</p>
        )}
      </div>
    </SectionCard>
  );
}

export function RoomsSummaryCard({ project, canEdit, title = "Rooms" }: { project: ProjectDetail; canEdit?: boolean; title?: string }) {
  const floors = project.floors ?? [];
  const totals = project.calculations;
  return (
    <SectionCard title={title} flush actions={<EditLink project={project} tab={5} canEdit={canEdit} />}>
      <DataTable
        rows={floors}
        getRowId={(f) => f.id}
        clientPageSize={0}
        empty={{ title: "No floors yet" }}
        columns={[
          { id: "floor", header: "Floor", cell: (f) => <span className="font-medium">{f.name}</span> },
          { id: "rooms", header: "Rooms", align: "right", cell: (f) => f.calculations.rooms },
          { id: "area", header: "Floor area", align: "right", cell: (f) => sqft(f.calculations.totalFloorAreaSqft) },
          { id: "wall", header: "Net wall", align: "right", cell: (f) => sqft(f.calculations.netWallAreaSqft) },
          { id: "wet", header: "Wet rooms", align: "right", cell: (f) => f.calculations.wetRooms },
        ]}
      />
      {totals ? (
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          {totals.rooms} rooms · {sqft(totals.totalFloorAreaSqft)} floor area · {sqft(totals.netWallAreaSqft)} net wall
        </p>
      ) : null}
    </SectionCard>
  );
}

export function SupplyRulesCard({ project, canEdit }: { project: ProjectDetail; canEdit?: boolean }) {
  const rules = project.supplyRules ?? [];
  return (
    <SectionCard title="Who supplies what" flush actions={<EditLink project={project} tab={2} canEdit={canEdit} />}>
      <DataTable
        rows={rules}
        getRowId={(r) => r.categoryKey}
        clientPageSize={0}
        empty={{ title: "Supply split not set yet", description: "Choose the contract type in tab 2." }}
        columns={[
          {
            id: "category",
            header: "Category",
            cell: (r) => <span className="font-medium">{SUPPLY_CATEGORIES.find((c) => c.key === r.categoryKey)?.label ?? r.label}</span>,
          },
          {
            id: "by",
            header: "Supplied by",
            cell: (r) => <StatusBadge tone={r.suppliedBy === "CONTRACTOR" ? "info" : "neutral"} label={r.suppliedBy === "CONTRACTOR" ? "Contractor" : "Owner"} />,
          },
          { id: "quality", header: "Quality category", cell: (r) => r.qualityCategory?.name ?? <span className="text-muted-foreground">—</span> },
          { id: "locked", header: "Locked", cell: (r) => (r.locked ? "Yes" : "No") },
        ]}
      />
    </SectionCard>
  );
}
