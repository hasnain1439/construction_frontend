"use client";

import { BellRing, FileText, KanbanSquare, Plus, Table2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetQuotesQuery } from "@/api/services/sales.api";
import { QUOTE_STATUSES, type QuoteStatus, type QuoteSummary } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT, type TranslationKey } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { QuoteStatusBadge } from "./shared";

type View = "board" | "table";
const EMPTY_FILTERS = { status: "", followUp: "" };
const nf = (n: number) => n.toLocaleString("en-PK", { maximumFractionDigits: 0 });

function QuoteCard({ q }: { q: QuoteSummary }) {
  const t = useT();
  return (
    <Link
      href={`/sales/quotes/${q.id}`}
      className="block space-y-1.5 rounded-xl border bg-card p-3 text-sm shadow-card transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
      data-testid={`quote-card-${q.number}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground tabular" dir="ltr">
          {q.number}
        </span>
        <span className="text-xs text-muted-foreground">{t("sales.pipeline.revision", { n: q.revision })}</span>
      </div>
      <p className="font-medium leading-snug">{q.title}</p>
      <p className="text-muted-foreground">{q.client.name}</p>
      <div className="flex items-center justify-between gap-2">
        <MoneyText paisa={q.pricePaisa} short className="font-semibold" />
        <span className="text-xs text-muted-foreground">{t("sales.pipeline.sqft", { n: nf(q.coveredAreaSqft) })}</span>
      </div>
      {q.followUp ? <StatusBadge tone="warning" icon={BellRing} label={t("sales.pipeline.followUpHint", { days: q.daysSinceActivity })} /> : null}
      {q.wonProject ? <p className="text-xs text-success">{t("sales.pipeline.project", { code: q.wonProject.code })}</p> : null}
      {q.status === "SENT" || q.status === "NEGOTIATION" || q.status === "DRAFT" ? (
        <p className="text-xs text-muted-foreground">{t("sales.pipeline.validUntil", { date: formatDate(q.validUntil) })}</p>
      ) : null}
    </Link>
  );
}

function Board({ quotes }: { quotes: QuoteSummary[] }) {
  const t = useT();
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" role="list" aria-label={t("sales.pipeline.board")}>
      {QUOTE_STATUSES.map((status) => {
        const items = quotes.filter((q) => q.status === status);
        return (
          <section key={status} role="listitem" className="w-64 shrink-0 space-y-2 rounded-2xl bg-muted/50 p-2" data-testid={`column-${status}`} aria-label={t(`sales.status.${status}` as TranslationKey)}>
            <header className="flex items-center justify-between px-1">
              <QuoteStatusBadge status={status} />
              <span className="text-xs text-muted-foreground tabular">{items.length}</span>
            </header>
            {items.length ? items.map((q) => <QuoteCard key={q.id} q={q} />) : <p className="px-1 py-4 text-center text-xs text-muted-foreground">{t("sales.pipeline.columnEmpty")}</p>}
          </section>
        );
      })}
    </div>
  );
}

/** Sales → Quote pipeline: board by status (default) or a table; search, status and follow-up filters. */
export function QuotePipelineView() {
  const t = useT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const canCreate = useCan("sales.quote.create");
  const [view, setView] = useState<View>("board");
  const list = useListState<{ status: string; followUp: string }>(EMPTY_FILTERS);
  // cleanParams drops the empty filters
  const query = { ...list.query, limit: view === "board" ? 100 : list.pageSize };
  const { data, isLoading, isFetching, error, refetch } = useGetQuotesQuery(query as Parameters<typeof useGetQuotesQuery>[0]);
  const quotes = data?.items ?? [];

  const columns: Column<QuoteSummary>[] = [
    {
      id: "number",
      header: t("sales.pipeline.colNumber"),
      cell: (q) => (
        <div>
          <p className="font-medium">{q.title}</p>
          <p className="text-xs text-muted-foreground tabular" dir="ltr">
            {q.number}
          </p>
        </div>
      ),
      sortValue: (q) => q.number,
    },
    { id: "client", header: t("sales.pipeline.colClient"), cell: (q) => q.client.name, sortValue: (q) => q.client.name },
    {
      id: "status",
      header: t("sales.pipeline.colStatus"),
      cell: (q) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <QuoteStatusBadge status={q.status} />
          {q.followUp ? <StatusBadge tone="warning" icon={BellRing} label={t("sales.pipeline.followUp")} /> : null}
        </div>
      ),
    },
    { id: "price", header: t("sales.pipeline.colPrice"), align: "right", cell: (q) => <MoneyText paisa={q.pricePaisa} /> },
    { id: "rate", header: t("sales.pipeline.colRate"), align: "right", cell: (q) => <MoneyText paisa={q.perSqftPaisa} /> },
    { id: "area", header: t("sales.pipeline.colArea"), align: "right", cell: (q) => <span className="tabular">{nf(q.coveredAreaSqft)}</span>, sortValue: (q) => q.coveredAreaSqft },
    { id: "valid", header: t("sales.pipeline.colValid"), cell: (q) => formatDate(q.validUntil), sortValue: (q) => q.validUntil },
    { id: "activity", header: t("sales.pipeline.colActivity"), cell: (q) => formatDate(q.lastActivityAt), sortValue: (q) => q.lastActivityAt },
  ];

  return (
    <>
      <PageHeader
        title={t("sales.pipeline.title")}
        description={t("sales.pipeline.description")}
        breadcrumbs={[{ label: t("crumb.sales") }, { label: t("sales.crumbQuotes") }]}
        actions={
          !readOnly && canCreate ? (
            <Button asChild>
              <Link href="/sales/quotes/new">
                <Plus data-icon="inline-start" />
                {t("sales.pipeline.newQuote")}
              </Link>
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("sales.pipeline.search")} />
        <SegmentedControl<string>
          size="sm"
          ariaLabel={t("sales.pipeline.colStatus")}
          value={list.filters.followUp ? "followUp" : list.filters.status || "all"}
          onChange={(v) => {
            list.setFilter("followUp", v === "followUp" ? "true" : "");
            list.setFilter("status", v === "all" || v === "followUp" ? "" : v);
          }}
          options={[
            { value: "all", label: t("sales.pipeline.allStatuses") },
            { value: "followUp", label: t("sales.pipeline.followUpOnly"), icon: BellRing },
            ...(view === "table" ? QUOTE_STATUSES.map((s: QuoteStatus) => ({ value: s, label: t(`sales.status.${s}` as TranslationKey) })) : []),
          ]}
        />
        <SegmentedControl<View>
          size="sm"
          ariaLabel={t("sales.pipeline.board")}
          value={view}
          onChange={setView}
          options={[
            { value: "board", label: t("sales.pipeline.board"), icon: KanbanSquare },
            { value: "table", label: t("sales.pipeline.table"), icon: Table2 },
          ]}
        />
      </FilterBar>
      {view === "board" ? (
        !isLoading && !quotes.length && !list.isFiltered ? (
          <SectionCard>
            <EmptyState icon={FileText} title={t("sales.pipeline.emptyTitle")} description={t("sales.pipeline.emptyDesc")} />
          </SectionCard>
        ) : (
          <Board quotes={quotes} />
        )
      ) : (
        <SectionCard flush>
          <DataTable
            rows={data?.items}
            columns={columns}
            getRowId={(q) => q.id}
            loading={isLoading || isFetching}
            error={error}
            onRetry={refetch}
            onRowClick={(q) => router.push(`/sales/quotes/${q.id}`)}
            empty={{ title: t("sales.pipeline.emptyTitle"), description: t("sales.pipeline.emptyDesc"), icon: FileText }}
            pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
          />
        </SectionCard>
      )}
    </>
  );
}
