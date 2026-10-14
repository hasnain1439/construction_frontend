"use client";

import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetShortagesQuery } from "@/api/services/dispatch.api";
import type { Shortage, ShortagesQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { ResolveShortageSlideOver } from "../components/DispatchSlideOvers";
import { useSiteProjectOptions } from "../options";

const SHORTAGE_STATUSES = ["OPEN", "RESOLVED"] as const;
const SHORTAGE_KINDS = ["DISPATCH_SHORT", "DAMAGED", "EXCESS", "SUPPLIER_SHORT"] as const;
const SHORTAGE_SOURCES = ["DISPATCH", "PURCHASE"] as const;

function useShortageColumns(onResolve?: (s: Shortage) => void): Column<Shortage>[] {
  const t = useT();
  const te = useEnumT();
  return [
    { id: "kind", header: t("field.type"), cell: (s) => <StatusBadge domain="shortageKind" value={s.kind} /> },
    {
      id: "what",
      header: t("field.material"),
      cell: (s) => (
        <div>
          <p className="font-medium">
            {formatQty(s.qty, s.material.unit)} {s.material.name}
          </p>
          {s.note ? <p className="line-clamp-1 text-xs text-muted-foreground">{s.note}</p> : null}
        </div>
      ),
    },
    {
      id: "source",
      header: t("field.from"),
      cell: (s) =>
        s.dispatch ? (
          <Link className="text-primary hover:underline" href={`/suppliers-stock/dispatches/${s.dispatch.id}`} onClick={(e) => e.stopPropagation()}>
            {s.dispatch.number}
          </Link>
        ) : s.purchase ? (
          <Link className="text-primary hover:underline" href={`/suppliers-stock/purchases/${s.purchase.id}`} onClick={(e) => e.stopPropagation()}>
            {s.purchase.number} · {s.purchase.supplier.name}
          </Link>
        ) : (
          "—"
        ),
    },
    { id: "site", header: t("field.site"), cell: (s) => s.project?.name ?? s.location.name },
    { id: "value", header: t("field.value"), align: "right", cell: (s) => <MoneyText paisa={s.valuePaisa} /> },
    { id: "date", header: t("procurement.shortages.colFound"), cell: (s) => formatDate(s.createdAt), sortValue: (s) => s.createdAt },
    {
      id: "status",
      header: t("field.status"),
      cell: (s) =>
        s.status === "OPEN" && onResolve ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResolve(s);
            }}
          >
            {t("procurement.shortages.resolve")}
          </Button>
        ) : (
          <div className="space-y-0.5">
            <StatusBadge domain="shortage" value={s.status} />
            {s.resolution ? <p className="text-xs text-muted-foreground">{te("procResolution", s.resolution)}{s.newDispatch ? ` · ${s.newDispatch.number}` : ""}</p> : null}
          </div>
        ),
    },
  ];
}

export function ShortagesView() {
  const t = useT();
  const ts = useStatusT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const owner = useCan("procurement.shortage.approve") && !readOnly;
  const projects = useSiteProjectOptions();
  const list = useListState({ status: "OPEN", kind: "", source: "", projectId: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetShortagesQuery(list.query as ShortagesQuery);
  const [resolving, setResolving] = useState<Shortage | null>(null);
  const columns = useShortageColumns(owner ? setResolving : undefined);
  return (
    <>
      <PageHeader title={t("procurement.common.shortages")} description={t("procurement.shortages.desc")} breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.shortages") }]} />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={SHORTAGE_STATUSES.map((value) => ({ value, label: ts("shortage", value) }))}
        />
        <FilterSelect
          label={t("field.type")}
          value={list.filters.kind}
          onChange={(v) => list.setFilter("kind", v)}
          options={SHORTAGE_KINDS.map((value) => ({ value, label: ts("shortageKind", value) }))}
        />
        <FilterSelect
          label={t("field.from")}
          value={list.filters.source}
          onChange={(v) => list.setFilter("source", v)}
          options={SHORTAGE_SOURCES.map((value) => ({ value, label: te("procShortageSource", value) }))}
        />
        <FilterSelect label={t("field.site")} value={list.filters.projectId} onChange={(v) => list.setFilter("projectId", v)} options={projects.options.map((o) => ({ value: o.value, label: o.label }))} />
      </FilterBar>
      <SectionCard
        flush
        title={data ? t("procurement.shortages.openCount", { n: data.meta.openCount }) : undefined}
        description={data?.meta.openValuePaisa !== undefined ? <>{t("procurement.shortages.openValue")} <MoneyText paisa={data.meta.openValuePaisa} /></> : undefined}
      >
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(s) => s.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t(list.filters.status === "OPEN" ? "procurement.shortages.noOpen" : "procurement.shortages.none"), description: t("procurement.shortages.emptyDesc"), icon: ClipboardCheck }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
      <ResolveShortageSlideOver shortage={resolving} open={Boolean(resolving)} onOpenChange={(o) => (!o ? setResolving(null) : undefined)} />
    </>
  );
}

