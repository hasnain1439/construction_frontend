"use client";

import { FileBarChart } from "lucide-react";
import { useState } from "react";
import { useGetReportQuery } from "@/api/services/reports.api";
import type { ReportCell, ReportColumnType, ReportName, ReportTable } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ExportMenu } from "@/components/common/ExportMenu";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { EMPTY_REPORT_FILTERS, ReportFilterBar, reportParams, type ReportFilters } from "@/components/common/ReportFilterBar";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { REPORTS } from "../reports.config";

/** One table cell by column type (money in rupees, quantities with up to 3 decimals). */
export function ReportValue({ type, value }: { type: ReportColumnType; value: ReportCell | undefined }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  switch (type) {
    case "money":
      return <MoneyText paisa={String(value)} className={cn(String(value).startsWith("-") && "text-danger")} />;
    case "qty":
    case "int":
      return <span className="tabular">{Number(value).toLocaleString("en-PK", { maximumFractionDigits: 3 })}</span>;
    case "percent":
      return <span className="tabular">{value}%</span>;
    case "date":
      return <span>{formatDate(String(value))}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

type Row = ReportTable["rows"][number] & { __id: string };

/**
 * Reports → one report: filters (project / dates where they apply), the table from the API's
 * columns, totals, notes and CSV / Excel / PDF export with the same filters.
 */
export function ReportView({ name }: { name: ReportName }) {
  const def = REPORTS[name];
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const params = reportParams({ projectId: def.project ? filters.projectId : "", from: def.dates ? filters.from : "", to: def.dates ? filters.to : "" });
  const q = useGetReportQuery({ name, ...params }, { refetchOnMountOrArgChange: true });
  const report = q.data;
  const columns: Column<Row>[] = (report?.columns ?? []).map((c) => ({
    id: c.key,
    header: c.label,
    align: c.type === "text" || c.type === "date" ? "left" : "right",
    sortValue: (r) => (c.type === "money" || c.type === "qty" || c.type === "int" ? Number(r[c.key] ?? 0) : String(r[c.key] ?? "")),
    cell: (r) => <ReportValue type={c.type} value={r[c.key]} />,
  }));
  const rows: Row[] | undefined = report?.rows.map((r, i) => ({ ...r, __id: String(i) }));
  const totals = report?.totals ? report.columns.filter((c) => report.totals![c.key] !== null && report.totals![c.key] !== undefined && c.type !== "text") : [];

  return (
    <div className="space-y-6">
      <PageHeader title={def.title} description={def.description} breadcrumbs={[{ label: "Reports" }, { label: def.title }]} actions={<ExportMenu name={name} filters={params} disabled={!report} />} />
      {def.project || def.dates ? <ReportFilterBar value={filters} onChange={setFilters} showProject={def.project} showDates={def.dates} dateLabel={def.dateLabel} /> : null}
      {report?.notes?.length ? (
        <InlineAlert tone="info">
          <ul className="space-y-0.5">
            {report.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}
      {totals.length ? (
        <SectionCard title="Totals" description={report?.subtitle}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {totals.map((c) => (
              <div key={c.key}>
                <dt className="text-xs text-muted-foreground">{c.label}</dt>
                <dd className="text-lg font-semibold">
                  <ReportValue type={c.type} value={report!.totals![c.key]} />
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      ) : null}
      <SectionCard flush title={report ? `${report.rows.length} row${report.rows.length === 1 ? "" : "s"}` : def.title}>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(r) => r.__id}
          loading={q.isLoading || q.isFetching}
          error={q.error}
          onRetry={q.refetch}
          clientPageSize={25}
          empty={{ title: "Nothing to report", description: "Try another project or date range.", icon: FileBarChart }}
        />
      </SectionCard>
    </div>
  );
}
