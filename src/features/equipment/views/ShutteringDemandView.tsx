"use client";

import { ArrowRightLeft, CalendarPlus, Layers, PackagePlus, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useGetShutteringDemandQuery } from "@/api/services/equipment.api";
import type {
  ShutteringCategory,
  ShutteringDemand,
  ShutteringDemandQuery,
  ShutteringMilestone,
  ShutteringSuggestion,
  ShutteringWarningCode,
  ShutteringWeek,
} from "@/api/types";
import { BarChartCard, type ValueFormat } from "@/components/common/Charts";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useSiteProjectOptions } from "@/features/procurement/options";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate, formatDayMonth } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { NewRentalSlideOver } from "../components/RentalSlideOvers";
import { NewTransferSlideOver } from "../components/TransferSlideOvers";
import { placeName } from "../options";
import { IdleEquipmentPanel } from "./IdleEquipmentPanel";

const WEEK_CHOICES = ["4", "8", "12", "26"] as const;
const WARNING_KEYS = {
  NO_PLATES: "equipment.shuttering.warnNoPlates",
  NO_COVERAGE: "equipment.shuttering.warnNoCoverage",
  NO_SCHEDULE: "equipment.shuttering.warnNoSchedule",
  AREA_FALLBACK: "equipment.shuttering.warnAreaFallback",
} as const satisfies Record<ShutteringWarningCode, string>;
const QTY: ValueFormat = { full: (v) => formatQty(v), short: (v) => formatQty(v) };
const DAY_MS = 86_400_000;
/** Sunday of the week that starts on `weekStart` (Monday). */
const weekEndOf = (weekStart: string) => new Date(Date.parse(`${weekStart}T00:00:00Z`) + 6 * DAY_MS).toISOString().slice(0, 10);

/** The chart's rows: owned + on rent stacked, the shortfall stacked on top in red, the need as a line. */
export function chartRows(weeks: ShutteringWeek[]) {
  return weeks.map((w) => ({
    week: formatDayMonth(w.weekStart),
    owned: w.ownedAvailable,
    onRent: w.onRent,
    shortfall: w.shortfall,
    needed: w.needed,
  }));
}

type Action =
  | { kind: "rent"; suggestion: ShutteringSuggestion }
  | { kind: "transfer"; suggestion: ShutteringSuggestion }
  | null;

/** Equipment → Shuttering Demand: weekly plates / props needed by the slab milestones vs owned and rented. */
export function ShutteringDemandView() {
  const t = useT();
  const projects = useSiteProjectOptions();
  const [projectId, setProjectId] = useState("");
  const [weeks, setWeeks] = useState<string>("8");
  const [category, setCategory] = useState<ShutteringCategory>("SHUTTERING_PLATE");
  const query = useGetShutteringDemandQuery({
    weeks: Number(weeks),
    ...(projectId ? { projectId } : {}),
  } as ShutteringDemandQuery);
  return (
    <>
      <PageHeader
        title={t("equipment.shuttering.title")}
        description={t("equipment.shuttering.desc")}
        breadcrumbs={[{ label: t("crumb.equipment") }, { label: t("equipment.crumb.shuttering") }]}
      />
      <FilterBar
        onClear={() => {
          setProjectId("");
          setWeeks("8");
        }}
        canClear={projectId !== "" || weeks !== "8"}
      >
        <FilterSelect
          label={t("field.project")}
          value={projectId}
          onChange={setProjectId}
          allLabel={t("equipment.shuttering.allProjects")}
          options={projects.options.map((o) => ({ value: o.value, label: o.label }))}
        />
        <FilterSelect
          label={t("equipment.shuttering.weeks")}
          value={weeks === "8" ? "" : weeks}
          onChange={(v) => setWeeks(v || "8")}
          allLabel={t("equipment.shuttering.weeksN", { n: 8 })}
          options={WEEK_CHOICES.filter((w) => w !== "8").map((w) => ({ value: w, label: t("equipment.shuttering.weeksN", { n: w }) }))}
        />
      </FilterBar>
      <QueryState query={query}>
        {(data) => <DemandBody data={data} category={category} onCategory={setCategory} />}
      </QueryState>
      <IdleEquipmentPanel projectId={projectId || undefined} />
    </>
  );
}

function DemandBody({
  data,
  category,
  onCategory,
}: {
  data: ShutteringDemand;
  category: ShutteringCategory;
  onCategory: (c: ShutteringCategory) => void;
}) {
  const t = useT();
  const weeks = data.series.find((s) => s.category === category)?.weeks ?? [];
  const suggestions = data.suggestions.filter((s) => s.category === category);
  const short = weeks.filter((w) => w.shortfall > 0);
  const worst = short.reduce<ShutteringWeek | null>((best, w) => (!best || w.shortfall > best.shortfall ? w : best), null);
  const peak = weeks.reduce((m, w) => Math.max(m, w.needed), 0);
  const first = weeks[0];
  const rows = chartRows(weeks);
  return (
    <div className="space-y-4">
      {data.warnings.length ? (
        <InlineAlert tone="warning" title={t("equipment.shuttering.warningsTitle")}>
          <ul className="list-disc space-y-1 ps-5">
            {data.warnings.map((w) => (
              <li key={`${w.code}-${w.project?.id ?? ""}`}>
                {t(WARNING_KEYS[w.code], { project: w.project?.name ?? "" })}
              </li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}
      <SegmentedControl
        value={category}
        onChange={onCategory}
        ariaLabel={t("equipment.shuttering.category")}
        options={[
          { value: "SHUTTERING_PLATE", label: t("equipment.shuttering.plates") },
          { value: "PROP", label: t("equipment.shuttering.props") },
        ]}
      />
      <KpiGroup columns="grid-cols-2 md:grid-cols-4" ariaLabel={t("equipment.shuttering.title")}>
        <KpiCard variant="tile" label={t("equipment.shuttering.kpiPeak")} value={formatQty(peak)} />
        <KpiCard variant="tile" label={t("equipment.shuttering.ownedAvailable")} value={formatQty(first?.ownedAvailable ?? 0)} />
        <KpiCard variant="tile" label={t("equipment.shuttering.onRent")} value={formatQty(first?.onRent ?? 0)} />
        <KpiCard
          variant="tile"
          tone={worst ? "danger" : "success"}
          label={t("equipment.shuttering.kpiWorst")}
          value={worst ? formatQty(worst.shortfall) : t("equipment.shuttering.noShortfall")}
          hint={worst ? t("equipment.shuttering.weekOf", { date: formatDate(worst.weekStart) }) : undefined}
        />
      </KpiGroup>
      <BarChartCard
        title={t("equipment.shuttering.chartTitle")}
        description={t("equipment.shuttering.chartDesc")}
        data={rows}
        xKey="week"
        stacked
        format={QTY}
        empty={!weeks.length}
        series={[
          { key: "owned", label: t("equipment.shuttering.ownedAvailable"), color: "var(--chart-1)" },
          { key: "onRent", label: t("equipment.shuttering.onRent"), color: "var(--chart-2)" },
          { key: "shortfall", label: t("equipment.shuttering.shortfall"), color: "var(--danger)" },
          // Weekly values: straight segments, never a curve dipping between weeks (QA-C-25).
          { key: "needed", label: t("equipment.shuttering.needed"), color: "var(--foreground)", kind: "line", curve: "linear" },
        ]}
      />
      <WeeksTable weeks={weeks} />
      <SuggestionList suggestions={suggestions} />
      <MilestonesTable milestones={data.milestones} />
      <Assumptions data={data} />
    </div>
  );
}

function WeeksTable({ weeks }: { weeks: ShutteringWeek[] }) {
  const t = useT();
  const columns: Column<ShutteringWeek>[] = [
    {
      id: "week",
      header: t("equipment.shuttering.week"),
      cell: (w) => (
        <span className="tabular">
          {t("equipment.shuttering.weekRange", { from: formatDate(w.weekStart), to: formatDate(w.weekEnd) })}
        </span>
      ),
    },
    { id: "needed", header: t("equipment.shuttering.needed"), align: "right", cell: (w) => formatQty(w.needed) },
    { id: "owned", header: t("equipment.shuttering.ownedAvailable"), align: "right", cell: (w) => formatQty(w.ownedAvailable) },
    { id: "onRent", header: t("equipment.shuttering.onRent"), align: "right", cell: (w) => formatQty(w.onRent) },
    {
      id: "shortfall",
      header: t("equipment.shuttering.shortfall"),
      align: "right",
      cell: (w) =>
        w.shortfall > 0 ? (
          <span className="font-semibold text-danger" data-testid={`short-${w.weekStart}`}>
            {formatQty(w.shortfall)}
          </span>
        ) : (
          "—"
        ),
    },
    { id: "surplus", header: t("equipment.shuttering.surplus"), align: "right", cell: (w) => (w.surplus > 0 ? formatQty(w.surplus) : "—") },
  ];
  return (
    <SectionCard title={t("equipment.shuttering.weeksTitle")} flush>
      <DataTable
        rows={weeks}
        columns={columns}
        getRowId={(w) => w.weekStart}
        clientPageSize={0}
        rowClassName={(w) => (w.shortfall > 0 ? "bg-danger-soft" : undefined)}
        empty={{ title: t("equipment.shuttering.milestonesEmpty") }}
      />
    </SectionCard>
  );
}

const ICONS = { RENT: PackagePlus, TRANSFER: ArrowRightLeft, EXTEND_RENTAL: CalendarPlus, RETURN_RENTAL: Undo2 } as const;

/** Plain-language line of a suggestion. */
export function useSuggestionText() {
  const t = useT();
  return (s: ShutteringSuggestion): { title: string; detail: string | null } => {
    const item = s.equipment?.name ?? "";
    const qty = formatQty(s.qty, s.equipment?.unit);
    const weeks =
      s.fromWeek === s.toWeek
        ? t("equipment.shuttering.weekOf", { date: formatDate(s.fromWeek) })
        : t("equipment.shuttering.weekRange", { from: formatDate(s.fromWeek), to: formatDate(weekEndOf(s.toWeek)) });
    const project = s.toProject?.name ?? "";
    switch (s.type) {
      case "RENT":
        return {
          title: t("equipment.shuttering.sugRent", { qty, item, weeks, project }),
          detail: s.supplier ? t("equipment.shuttering.sugRentFrom", { supplier: s.supplier.name }) : null,
        };
      case "TRANSFER":
        if (!s.fromProject) return { title: t("equipment.shuttering.sugTransferYard", { qty, item, project, weeks }), detail: null };
        return {
          title: t("equipment.shuttering.sugTransferSite", { qty, item, from: s.fromProject.name, project, weeks }),
          detail: s.idleAfterWeek
            ? t("equipment.shuttering.sugIdleAfter", { from: s.fromProject.name, date: formatDate(weekEndOf(s.idleAfterWeek)) })
            : t("equipment.shuttering.sugIdleNow", { from: s.fromProject.name }),
        };
      case "EXTEND_RENTAL":
        return {
          title: t("equipment.shuttering.sugExtend", { rental: s.rental?.number ?? "", qty, item, project, date: formatDate(weekEndOf(s.toWeek)) }),
          detail: null,
        };
      case "RETURN_RENTAL":
        return {
          title: t("equipment.shuttering.sugReturn", { qty, item, rental: s.rental?.number ?? "", from: s.fromProject?.name ?? placeName(t, s.from) }),
          detail: s.idleAfterWeek ? t("equipment.shuttering.sugReturnAfter", { date: formatDate(weekEndOf(s.idleAfterWeek)) }) : null,
        };
    }
  };
}

function SuggestionList({ suggestions }: { suggestions: ShutteringSuggestion[] }) {
  const t = useT();
  const text = useSuggestionText();
  const readOnly = useReadOnly();
  const canRent = useCan("equipment.rental.manage") && !readOnly;
  const canMove = useCan("equipment.transfer.create") && !readOnly;
  const [action, setAction] = useState<Action>(null);
  const button = (s: ShutteringSuggestion): ReactNode => {
    if (s.type === "RENT" && canRent)
      return (
        <Button size="sm" variant="outline" onClick={() => setAction({ kind: "rent", suggestion: s })}>
          {t("equipment.shuttering.actRent")}
        </Button>
      );
    if (s.type === "TRANSFER" && canMove && s.from)
      return (
        <Button size="sm" variant="outline" onClick={() => setAction({ kind: "transfer", suggestion: s })}>
          {t("equipment.shuttering.actTransfer")}
        </Button>
      );
    if ((s.type === "EXTEND_RENTAL" || s.type === "RETURN_RENTAL") && s.rental)
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/equipment/rentals/${s.rental.id}`}>{t("equipment.shuttering.actOpenRental")}</Link>
        </Button>
      );
    return null;
  };
  const current = action?.suggestion;
  return (
    <SectionCard title={t("equipment.shuttering.suggestionsTitle")} description={t("equipment.shuttering.suggestionsDesc")}>
      {suggestions.length ? (
        <ul className="divide-y" data-testid="suggestions">
          {suggestions.map((s, i) => {
            const Icon = ICONS[s.type];
            const { title, detail } = text(s);
            return (
              <li key={`${s.type}-${i}`} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <span className="flex min-w-0 items-start gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-medium">{title}</span>
                    {detail ? <span className="block text-sm text-muted-foreground">{detail}</span> : null}
                  </span>
                </span>
                {button(s)}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("equipment.shuttering.suggestionsEmpty")}</p>
      )}
      {action?.kind === "rent" && current ? (
        <NewRentalSlideOver
          open
          onOpenChange={(open) => !open && setAction(null)}
          defaultProjectId={current.toProject?.id}
          prefill={{
            supplierId: current.supplier?.id ?? null,
            equipmentId: current.equipment?.id ?? null,
            qty: current.qty,
            expectedEndDate: weekEndOf(current.toWeek),
            note: text(current).title,
          }}
        />
      ) : null}
      {action?.kind === "transfer" && current ? (
        <NewTransferSlideOver
          open
          onOpenChange={(open) => !open && setAction(null)}
          defaultFromId={current.from?.id ?? null}
          prefill={{ toProjectId: current.toProject?.id ?? null, equipmentId: current.equipment?.id ?? null, qty: current.qty }}
        />
      ) : null}
    </SectionCard>
  );
}

function MilestonesTable({ milestones }: { milestones: ShutteringMilestone[] }) {
  const t = useT();
  const te = useEnumT();
  const columns: Column<ShutteringMilestone>[] = [
    {
      id: "milestone",
      header: t("equipment.shuttering.colMilestone"),
      cell: (m) => (
        <span className="min-w-0">
          <span className="block font-medium">{m.milestone.name}</span>
          <span className="block text-xs text-muted-foreground">{m.project.name}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: t("field.status"),
      cell: (m) => <StatusBadge tone={m.milestone.status === "IN_PROGRESS" ? "info" : "neutral"} label={te("shutteringMilestoneStatus", m.milestone.status)} />,
    },
    {
      id: "held",
      header: t("equipment.shuttering.colHeld"),
      cell: (m) => (
        <span className="tabular">{t("equipment.shuttering.weekRange", { from: formatDate(m.holdFrom), to: formatDate(m.holdUntil) })}</span>
      ),
    },
    {
      id: "area",
      header: t("equipment.shuttering.colArea"),
      align: "right",
      cell: (m) => (
        <span className="tabular">
          <span className="block">{formatQty(m.area.totalSqft)}</span>
          <span className="block text-xs text-muted-foreground">
            {t("equipment.shuttering.areaSplit", { slab: formatQty(m.area.slabSqft), beams: formatQty(m.area.beamSqft) })}
          </span>
        </span>
      ),
    },
    { id: "source", header: t("equipment.shuttering.colSource"), cell: (m) => te("shutteringAreaSource", m.area.source) },
    { id: "plates", header: t("equipment.shuttering.plates"), align: "right", cell: (m) => formatQty(m.plates) },
    { id: "props", header: t("equipment.shuttering.props"), align: "right", cell: (m) => formatQty(m.props) },
  ];
  return (
    <SectionCard title={t("equipment.shuttering.milestonesTitle")} flush>
      <DataTable
        rows={milestones}
        columns={columns}
        getRowId={(m) => m.milestone.id}
        clientPageSize={0}
        empty={{ title: t("equipment.shuttering.milestonesEmpty"), description: t("equipment.shuttering.milestonesEmptyDesc"), icon: Layers }}
      />
    </SectionCard>
  );
}

function Assumptions({ data }: { data: ShutteringDemand }) {
  const t = useT();
  const canEdit = useCan("company.settings.manage");
  const p = data.parameters;
  return (
    <InlineAlert
      tone="info"
      title={t("equipment.shuttering.assumptionsTitle")}
      action={
        canEdit ? (
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings/alerts">{t("equipment.shuttering.editSettings")}</Link>
          </Button>
        ) : null
      }
    >
      {t("equipment.shuttering.assumptions", {
        coverage: formatQty(p.plateCoverageSqft),
        props: formatQty(p.propsPerPlate),
        spare: formatQty(p.sparePercent),
        beams: formatQty(p.beamSidesPercent),
        strike: p.defaultStrikeDays,
      })}
      {p.plateCoverageSource === "DEFAULT" ? ` ${t("equipment.shuttering.coverageDefault")}` : null}
    </InlineAlert>
  );
}
