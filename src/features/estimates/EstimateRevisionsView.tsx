"use client";

import { ExternalLink, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCompareEstimatesQuery, useGetEstimatesQuery } from "@/api/services/estimates.api";
import type { CompareChange, EstimateCompare, EstimateCompareLine, EstimateSummary } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { RequireAccess } from "@/components/common/RequireAccess";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useStatusT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import type { StatusTone } from "@/lib/status";
import { boqUnit, fmt, hasMargin, hasMoney, rupees, sectionText, stageText } from "./labels";

/** Project → Planning → Estimate Revisions: every saved revision + compare two. */
export function EstimateRevisionsView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <RequireAccess permission="projects.estimate.view">
      <ProjectPageShell projectId={projectId} crumb={t("estimates.revisions.crumb")}>
        {() => <RevisionsBody projectId={projectId} />}
      </ProjectPageShell>
    </RequireAccess>
  );
}

const byOn = (t: ReturnType<typeof useT>, person: { name: string } | null, at: string | null) =>
  at ? t("estimates.revisions.byOn", { name: person?.name ?? "—", date: formatDate(at.slice(0, 10)) }) : "—";

export function RevisionsBody({ projectId }: { projectId: string }) {
  const t = useT();
  const router = useRouter();
  const q = useGetEstimatesQuery(projectId);
  const list = q.data ?? [];
  const [pair, setPair] = useState<{ a: string; b: string } | null>(null);
  const money = list.some(hasMoney);
  const margin = list.some(hasMargin);
  const open = (r: EstimateSummary) => router.push(`${projectHref(projectId, "/planning/estimate")}?rev=${encodeURIComponent(r.id)}`);
  // Default compare: the two newest revisions (older → newer).
  const a = pair?.a ?? list[1]?.id ?? "";
  const b = pair?.b ?? list[0]?.id ?? "";
  const columns: Column<EstimateSummary>[] = [
    { id: "rev", header: t("estimates.revisions.col.revision"), cell: (r) => <span className="font-medium tabular">{t("estimates.revisions.rev", { n: r.revision })}</span>, sortValue: (r) => r.revision },
    {
      id: "status",
      header: t("estimates.revisions.col.status"),
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          <StatusBadge domain="estimateRevision" value={r.status} />
          {r.ratesOutdated && r.status === "DRAFT" ? <StatusBadge tone="warning" label={t("estimates.revisions.outdated")} /> : null}
        </span>
      ),
    },
    { id: "total", header: t("estimates.revisions.col.total"), align: "right", hidden: !money, cell: (r) => <span className="tabular font-medium">{rupees(r.totalPaisa)}</span> },
    { id: "perSqft", header: t("estimates.revisions.col.perSqft"), align: "right", hidden: !money, cell: (r) => <span className="tabular">{r.perSqftPaisa ? rupees(r.perSqftPaisa) : "—"}</span> },
    {
      id: "margin",
      header: t("estimates.revisions.col.margin"),
      align: "right",
      hidden: !margin,
      cell: (r) => <span className="tabular">{r.marginPercent === null || r.marginPercent === undefined ? "—" : `${fmt(r.marginPercent)}%`}</span>,
    },
    { id: "generated", header: t("estimates.revisions.col.generated"), cell: (r) => byOn(t, r.generatedBy, r.generatedAt) },
    { id: "approved", header: t("estimates.revisions.col.approved"), cell: (r) => byOn(t, r.approvedBy, r.approvedAt) },
    { id: "note", header: t("estimates.revisions.col.note"), cell: (r) => <span className="text-muted-foreground">{r.note ?? "—"}</span> },
    {
      ...ACTIONS_COLUMN,
      cell: (r) => {
        const previous = list.find((x) => x.revision < r.revision);
        return (
          <RowActions
            name={t("estimates.revisions.rev", { n: r.revision })}
            actions={[
              { label: t("estimates.revisions.open"), icon: ExternalLink, onSelect: () => open(r) },
              ...(previous
                ? [{ label: t("estimates.revisions.compareWithPrevious", { n: previous.revision }), icon: GitCompareArrows, onSelect: () => setPair({ a: previous.id, b: r.id }) }]
                : []),
            ]}
          />
        );
      },
    },
  ];
  if (q.isLoading) return <CardsSkeleton count={2} height="h-40" />;
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted-foreground">{t("estimates.revisions.desc")}</p>
      <SectionCard flush>
        <DataTable
          rows={q.data}
          columns={columns}
          getRowId={(r) => r.id}
          error={q.error}
          onRetry={q.refetch}
          onRowClick={open}
          clientPageSize={0}
          empty={{
            title: t("estimates.revisions.empty"),
            description: t("estimates.revisions.emptyBody"),
            action: (
              <Button asChild>
                <Link href={projectHref(projectId, "/planning/estimate")}>{t("estimates.revisions.openEstimate")}</Link>
              </Button>
            ),
          }}
        />
      </SectionCard>
      {list.length ? <ComparePanel list={list} a={a} b={b} onChange={(next) => setPair({ a, b, ...next })} /> : null}
    </div>
  );
}

function RevisionSelect({ id, label, value, list, onChange }: { id: string; label: string; value: string; list: EstimateSummary[]; onChange: (id: string) => void }) {
  const t = useT();
  const ts = useStatusT();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-60 max-w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {list.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {t("estimates.boq.revisionOption", { n: r.revision, status: ts("estimateRevision", r.status) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ComparePanel({ list, a, b, onChange }: { list: EstimateSummary[]; a: string; b: string; onChange: (next: { a?: string; b?: string }) => void }) {
  const t = useT();
  const ready = Boolean(a && b && a !== b);
  const q = useCompareEstimatesQuery({ a, b }, { skip: !ready });
  return (
    <SectionCard title={t("estimates.compare.title")} description={t("estimates.compare.desc")}>
      {list.length < 2 ? (
        <p className="text-sm text-muted-foreground">{t("estimates.compare.needTwo")}</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <RevisionSelect id="compare-a" label={t("estimates.compare.a")} value={a} list={list} onChange={(id) => onChange({ a: id })} />
            <RevisionSelect id="compare-b" label={t("estimates.compare.b")} value={b} list={list} onChange={(id) => onChange({ b: id })} />
          </div>
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t("estimates.compare.same")}</p>
          ) : q.isLoading || q.isFetching ? (
            <CardsSkeleton count={2} height="h-24" />
          ) : q.data ? (
            <CompareResult data={q.data} />
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

const CHANGE_TONE: Record<CompareChange, StatusTone> = { ADDED: "success", REMOVED: "danger", CHANGED: "warning", UNCHANGED: "neutral" };

const signed = (paisa: string | null | undefined) => {
  if (paisa === null || paisa === undefined) return "—";
  return paisa.startsWith("-") ? `−${rupees(paisa.slice(1))}` : paisa === "0" ? rupees(paisa) : `+${rupees(paisa)}`;
};
const signedQty = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : fmt(0));

export function CompareResult({ data }: { data: EstimateCompare }) {
  const t = useT();
  const [showUnchanged, setShowUnchanged] = useState(false);
  const money = Boolean(data.totals);
  const ra = data.a.revision;
  const rb = data.b.revision;
  const lines = data.lines.filter((l) => showUnchanged || l.change !== "UNCHANGED");
  const lineColumns: Column<EstimateCompareLine>[] = [
    { id: "change", header: t("estimates.compare.col.change"), cell: (l) => <StatusBadge tone={CHANGE_TONE[l.change]} label={t(`estimates.compare.change.${l.change}`)} /> },
    {
      id: "item",
      header: t("estimates.compare.col.item"),
      cell: (l) => (
        <div className="min-w-44">
          <p className="font-medium">{l.description}</p>
          <p className="text-xs text-muted-foreground">
            {sectionText(t, l.section)} · {stageText(t, l.stageKey)}
          </p>
        </div>
      ),
    },
    { id: "qa", header: t("estimates.compare.col.qtyRev", { n: ra }), align: "right", cell: (l) => <span className="tabular">{l.quantityA === null ? "—" : fmt(l.quantityA)}</span> },
    { id: "qb", header: t("estimates.compare.col.qtyRev", { n: rb }), align: "right", cell: (l) => <span className="tabular">{l.quantityB === null ? "—" : fmt(l.quantityB)}</span> },
    {
      id: "qd",
      header: t("estimates.compare.col.qtyDelta"),
      align: "right",
      cell: (l) => (
        <span className={cn("tabular", l.quantityDelta > 0 ? "text-warning" : l.quantityDelta < 0 ? "text-success" : "text-muted-foreground")}>
          {signedQty(l.quantityDelta)} {boqUnit(t, l.unit)}
        </span>
      ),
    },
    { id: "aa", header: t("estimates.compare.col.amountRev", { n: ra }), align: "right", hidden: !money, cell: (l) => <span className="tabular">{l.amountPaisaA ? rupees(l.amountPaisaA) : "—"}</span> },
    { id: "ab", header: t("estimates.compare.col.amountRev", { n: rb }), align: "right", hidden: !money, cell: (l) => <span className="tabular">{l.amountPaisaB ? rupees(l.amountPaisaB) : "—"}</span> },
    { id: "ad", header: t("estimates.compare.col.amountDelta"), align: "right", hidden: !money, cell: (l) => <span className="tabular font-medium">{signed(l.amountDeltaPaisa)}</span> },
  ];
  type SectionRow = EstimateCompare["sections"][number];
  const sectionColumns: Column<SectionRow>[] = [
    { id: "section", header: t("estimates.compare.col.section"), cell: (s) => sectionText(t, s.section) },
    { id: "a", header: t("estimates.compare.col.amountRev", { n: ra }), align: "right", cell: (s) => <span className="tabular">{rupees(s.amountPaisaA)}</span> },
    { id: "b", header: t("estimates.compare.col.amountRev", { n: rb }), align: "right", cell: (s) => <span className="tabular">{rupees(s.amountPaisaB)}</span> },
    { id: "d", header: t("estimates.compare.col.amountDelta"), align: "right", cell: (s) => <span className="tabular font-medium">{signed(s.deltaPaisa)}</span> },
  ];
  return (
    <div className="space-y-6" data-testid="compare-result">
      {data.totals ? (
        <KpiGroup columns="sm:grid-cols-3">
          <KpiCard variant="tile" label={t("estimates.compare.total", { n: ra })} value={rupees(data.totals.totalPaisaA)} />
          <KpiCard variant="tile" label={t("estimates.compare.total", { n: rb })} value={rupees(data.totals.totalPaisaB)} />
          <KpiCard
            variant="tile"
            highlight
            label={t("estimates.compare.difference")}
            value={signed(data.totals.deltaPaisa)}
            hint={data.totals.deltaPercent === null ? undefined : t("estimates.compare.differenceHint", { percent: fmt(data.totals.deltaPercent), n: ra })}
          />
        </KpiGroup>
      ) : null}
      {money ? (
        <div className="space-y-2">
          <h3 className="font-semibold">{t("estimates.compare.sections")}</h3>
          <div className="overflow-hidden rounded-2xl border">
            <DataTable rows={data.sections} columns={sectionColumns} getRowId={(s) => s.section} clientPageSize={0} empty={{ title: t("estimates.compare.noChanges") }} />
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">{t("estimates.compare.lines")}</h3>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={showUnchanged} onCheckedChange={setShowUnchanged} />
            {t("estimates.compare.showUnchanged")}
          </label>
        </div>
        <div className="overflow-hidden rounded-2xl border">
          <DataTable
            rows={lines}
            columns={lineColumns}
            getRowId={(l) => l.lineKey}
            clientPageSize={50}
            empty={{ title: t("estimates.compare.noChanges") }}
            rowClassName={(l) => (l.change === "UNCHANGED" ? "text-muted-foreground" : undefined)}
          />
        </div>
      </div>
    </div>
  );
}
