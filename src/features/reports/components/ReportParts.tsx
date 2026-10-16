"use client";

import { ChevronDown, Download, FileBarChart, Loader2 } from "lucide-react";
import { useCallback, type ReactNode } from "react";
import { useExportReportBookMutation, useGetReportBookQuery } from "@/api/services/reports.api";
import type { ReportBook, ReportBookName, ReportCell, ReportColumn, ReportFormat, ReportSection } from "@/api/types";
import type { ValueFormat } from "@/components/common/Charts";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EXPORT_FORMATS } from "@/components/common/ExportMenu";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutationToast } from "@/hooks/useMutationToast";
import { isTranslationKey, useStatusT, useT } from "@/i18n/useT";
import { errorCode } from "@/lib/apiErrors";
import { ReportValue } from "../views/ReportView";

/** Columns whose cells are enum values (labelled from `reports.v.<column>.<VALUE>`). */
const ENUM_COLUMNS = new Set(["coStatus", "coType", "proofType", "snagStatus", "milestoneStatus", "stoppageStatus", "delayCategory", "reason", "bucket", "varianceStatus", "category", "assigneeKind", "stage", "progressBasis", "projectionBasis"]);

/** Counts / days on a chart axis (not rupees). */
export const COUNT_FORMAT: ValueFormat = { full: (v) => v.toLocaleString("en-PK", { maximumFractionDigits: 1 }), short: (v) => v.toLocaleString("en-PK", { maximumFractionDigits: 0 }) };
export const PERCENT_FORMAT: ValueFormat = { full: (v) => `${v}%`, short: (v) => `${v}%` };

/** Column header and enum cell labels in the reader's language (the API's JSON is English). */
export function useReportLabels() {
  const t = useT();
  const ts = useStatusT();
  const header = useCallback(
    (c: Pick<ReportColumn, "key" | "label">) => {
      const age = /^age_(.+)$/.exec(c.key);
      if (age) return t("reports.col.ageRange", { range: age[1]! });
      const key = `reports.col.${c.key}`;
      return isTranslationKey(key) ? t(key) : c.label;
    },
    [t],
  );
  const value = useCallback(
    (column: string, v: ReportCell | undefined): string | null => {
      if (v === null || v === undefined || v === "") return null;
      if (column === "status") return ts("project", String(v));
      if (!ENUM_COLUMNS.has(column)) return null;
      const key = `reports.v.${column}.${String(v)}`;
      return isTranslationKey(key) ? t(key) : String(v);
    },
    [t, ts],
  );
  const section = useCallback((s: Pick<ReportSection, "key" | "title">) => {
    const key = `reports.section.${s.key}`;
    return isTranslationKey(key) ? t(key) : s.title;
  }, [t]);
  return { header, value, section };
}

/** One cell: enum label, else money / quantity / percent / date by type. */
export function ReportCellView({ column, value }: { column: ReportColumn; value: ReportCell | undefined }) {
  const labels = useReportLabels();
  const label = labels.value(column.key, value);
  if (label !== null) return <bdi>{label}</bdi>;
  return <ReportValue type={column.type} value={value} />;
}

type Row = Record<string, ReportCell> & { __id: string };

/** A report table (API columns, translated headers, enum cells, totals line under it). */
export function ReportTableCard({
  title,
  description,
  columns,
  rows,
  totals,
  loading,
  error,
  onRetry,
  render,
  actions,
  pageSize = 25,
}: {
  title: ReactNode;
  description?: ReactNode;
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>> | undefined;
  totals?: Record<string, ReportCell> | null;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Custom cell for some columns (e.g. reasons rendered from structured data). */
  render?: Partial<Record<string, (row: Record<string, ReportCell>, index: number) => ReactNode>>;
  actions?: ReactNode;
  pageSize?: number;
}) {
  const t = useT();
  const labels = useReportLabels();
  const cols: Column<Row>[] = columns.map((c) => ({
    id: c.key,
    header: labels.header(c),
    align: c.type === "text" || c.type === "date" ? "left" : "right",
    sortValue: (r) => (c.type === "money" || c.type === "qty" || c.type === "int" || c.type === "percent" ? Number(r[c.key] ?? 0) : String(r[c.key] ?? "")),
    cell: (r) => (render?.[c.key] ? render[c.key]!(r, Number(r.__id)) : <ReportCellView column={c} value={r[c.key]} />),
  }));
  const data: Row[] | undefined = rows?.map((r, i) => ({ ...r, __id: String(i) }));
  const shownTotals = totals ? columns.filter((c) => c.type !== "text" && c.type !== "date" && totals[c.key] !== null && totals[c.key] !== undefined) : [];
  return (
    <SectionCard flush title={title} description={description} actions={actions}>
      <DataTable
        rows={data}
        columns={cols}
        getRowId={(r) => r.__id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        clientPageSize={pageSize}
        empty={{ title: t("reports.common.nothing"), description: t("reports.common.nothingDesc"), icon: FileBarChart }}
      />
      {shownTotals.length ? (
        <dl className="grid gap-4 border-t px-6 py-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("reports.common.totals")}>
          {shownTotals.map((c) => (
            <div key={c.key}>
              <dt className="text-xs text-muted-foreground">{labels.header(c)}</dt>
              <dd className="text-base font-semibold">
                <ReportValue type={c.type} value={totals![c.key]} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </SectionCard>
  );
}

/** CSV / Excel / PDF of one project's report book. */
export function BookExportMenu({ name, projectId, filters }: { name: ReportBookName; projectId: string; filters?: { from?: string; to?: string } }) {
  const t = useT();
  const [exportBook, state] = useExportReportBookMutation();
  const run = useMutationToast();
  const download = async (format: Exclude<ReportFormat, "json">) => {
    const file = await run(() => exportBook({ name, projectId, format, ...filters }).unwrap(), { success: (f) => t("app.components.exportMenu.ready", { name: f.fileName }) });
    if (file) window.open(file.url, "_blank", "noopener,noreferrer");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={state.isLoading}>
          {state.isLoading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}
          {t("reports.common.projectExport")}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPORT_FORMATS.map(({ format, label, icon: Icon }) => (
          <DropdownMenuItem key={format} onSelect={() => void download(format)}>
            <Icon aria-hidden />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The book's content (fixture-testable): summary figures + one table per section. */
export function ReportBookContent({ book, actions }: { book: ReportBook; actions?: ReactNode }) {
  const t = useT();
  const labels = useReportLabels();
  const reasonsOf = (category: string) =>
    (book.extra?.reasons ?? [])
      .filter((r) => r.category === category)
      .map((r) => `${labels.value("reason", r.reason)} ${r.days}`)
      .join(" · ");
  return (
    <div className="space-y-4">
      <SectionCard title={t("reports.common.projectReport", { code: book.project.code })} description={book.project.name} actions={actions}>
        <dl className="grid gap-4 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          {book.summary.map((s) => (
            <div key={s.key}>
              <dt className="text-xs text-muted-foreground">{labels.header(s)}</dt>
              <dd className="text-base font-semibold">
                <ReportCellView column={s} value={s.value} />
              </dd>
            </div>
          ))}
        </dl>
      </SectionCard>
      {book.sections.map((s) => (
        <ReportTableCard
          key={s.key}
          title={labels.section(s)}
          columns={s.columns}
          rows={s.rows}
          totals={s.totals}
          pageSize={10}
          render={s.key === "categories" && book.extra?.reasons ? { reasons: (r) => <bdi>{reasonsOf(String(r["delayCategory"]))}</bdi> } : undefined}
        />
      ))}
    </div>
  );
}

/** One project's report book under a company report (delay analysis, variance, snags). */
export function ReportBookPanel({ name, projectId, from, to }: { name: ReportBookName; projectId: string; from?: string; to?: string }) {
  const t = useT();
  const filters = { ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const q = useGetReportBookQuery({ name, projectId, ...filters });
  if (q.isLoading || q.isFetching) return <CardsSkeleton />;
  if (q.error) return <InlineAlert tone={errorCode(q.error) === "NO_SCHEDULE" ? "info" : "danger"}>{errorCode(q.error) === "NO_SCHEDULE" ? t("reports.common.noSchedule") : t("reports.common.loadFailed")}</InlineAlert>;
  if (!q.data) return null;
  return <ReportBookContent book={q.data} actions={<BookExportMenu name={name} projectId={projectId} filters={filters} />} />;
}

