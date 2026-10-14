"use client";

import { Truck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCancelDispatchMutation, useGetDispatchesQuery, useGetDispatchQuery } from "@/api/services/dispatch.api";
import { useGetStockLocationsQuery, useGetStoreStockQuery } from "@/api/services/inventory.api";
import type { Dispatch, DispatchItem, DispatchesQuery } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { DifferenceBadge } from "@/components/common/DifferenceBadge";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { LateSyncBadge } from "@/components/common/LateSyncBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useStatusT, useT, type TranslationKey } from "@/i18n/useT";
import { formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { formatQty } from "@/lib/quantity";
import { NewDispatchSlideOver } from "../components/DispatchSlideOvers";
import { useSiteProjectOptions } from "../options";

const BASE = "/suppliers-stock/dispatches";
const DISPATCH_STATUSES = ["ON_THE_WAY", "RECEIVED", "RECEIVED_WITH_SHORTAGE", "RECEIVED_WITH_EXCESS", "CANCELLED"] as const;

/** "Central Store" or the site name, in the current language. */
const place = (t: (key: TranslationKey) => string, l: Dispatch["from"]) => (l.type === "STORE" ? t("field.centralStore") : l.name);

export function DispatchesView() {
  const t = useT();
  const ts = useStatusT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const owner = useCan("procurement.dispatch.create") && !readOnly;
  const projects = useSiteProjectOptions();
  const list = useListState({ status: "", projectId: "", from: "", to: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetDispatchesQuery(list.query as DispatchesQuery);
  const locations = useGetStockLocationsQuery();
  const store = locations.data?.find((l) => l.type === "STORE");
  const storeStock = useGetStoreStockQuery({ locationId: store?.id ?? "" }, { skip: !store || !owner });
  const available = useMemo(() => (storeStock.data?.items ?? []).map((i) => ({ materialId: i.material.id, qty: i.inStore, unit: i.material.unit })), [storeStock.data]);
  const [newOpen, setNewOpen] = useState(false);

  const columns: Column<Dispatch>[] = [
    { id: "number", header: t("procurement.common.gatePass"), cell: (d) => <span className="font-medium tabular">{d.number}</span> },
    { id: "date", header: t("field.sent"), cell: (d) => formatDateTime(d.dispatchedAt), sortValue: (d) => d.dispatchedAt },
    { id: "route", header: t("procurement.dispatch.colRoute"), cell: (d) => t("procurement.common.route", { from: place(t, d.from), to: place(t, d.to) }) },
    { id: "items", header: t("field.materials"), cell: (d) => d.items.map((i) => (i.sentQty !== undefined ? `${formatQty(i.sentQty, i.material.unit)} ${i.material.name}` : i.material.name)).join(", ") },
    { id: "vehicle", header: t("procurement.dispatch.colVehicleDriver"), cell: (d) => [d.vehicleNo, d.driverName].filter(Boolean).join(" · ") || "—" },
    { id: "value", header: t("field.value"), align: "right", cell: (d) => <MoneyText paisa={d.totalValuePaisa} /> },
    { id: "status", header: t("field.status"), cell: (d) => <StatusBadge domain="dispatch" value={d.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={t("procurement.dispatch.listTitle")}
        description={t("procurement.dispatch.listDesc")}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.dispatches") }]}
        actions={
          owner && store ? (
            <Button onClick={() => setNewOpen(true)}>
              <Truck data-icon="inline-start" />
              {t("procurement.dispatch.newDispatch")}
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("procurement.dispatch.searchPlaceholder")} />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={DISPATCH_STATUSES.map((value) => ({ value, label: ts("dispatch", value) }))}
        />
        <FilterSelect label={t("field.site")} value={list.filters.projectId} onChange={(v) => list.setFilter("projectId", v)} options={projects.options.map((o) => ({ value: o.value, label: o.label }))} />
        <DateRangePicker
          value={{ from: list.filters.from, to: list.filters.to }}
          onChange={(r) => {
            list.setFilter("from", r.from);
            list.setFilter("to", r.to);
          }}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(d) => d.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(d) => router.push(`${BASE}/${d.id}`)}
          empty={{ title: t("procurement.dispatch.emptyTitle"), description: t("procurement.dispatch.emptyDesc"), icon: Truck }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
      {store ? (
        <NewDispatchSlideOver open={newOpen} onOpenChange={setNewOpen} fromOptions={[{ value: store.id, label: t("field.centralStore") }]} defaultFromId={store.id} available={available} />
      ) : null}
    </>
  );
}

/** Sent vs received per material (after the count), with the difference badge. */
export function DispatchItemsTable({ dispatch }: { dispatch: Dispatch }) {
  const t = useT();
  const counted = dispatch.status !== "ON_THE_WAY" && dispatch.status !== "CANCELLED";
  const columns: Column<DispatchItem>[] = [
    { id: "material", header: t("field.material"), cell: (i) => <span className="font-medium">{i.material.name}</span> },
    { id: "sent", header: t("field.sent"), align: "right", hidden: dispatch.blindCount, cell: (i) => formatQty(i.sentQty ?? null, i.material.unit) },
    { id: "received", header: t("field.received"), align: "right", hidden: !counted, cell: (i) => formatQty(i.receivedQty, i.material.unit) },
    { id: "damaged", header: t("field.damaged"), align: "right", hidden: !counted, cell: (i) => (i.damagedQty ? formatQty(i.damagedQty, i.material.unit) : "—") },
    {
      id: "result",
      header: t("procurement.dispatch.colResult"),
      hidden: !counted,
      cell: (i) =>
        i.sentQty !== undefined && i.receivedQty !== null ? <DifferenceBadge expected={i.sentQty} counted={i.receivedQty} damaged={i.damagedQty ?? 0} difference={i.differenceQty} unit={i.material.unit} /> : null,
    },
    { id: "cost", header: t("procurement.dispatch.colAvgCost"), align: "right", cell: (i) => <MoneyText paisa={i.unitCostPaisa} /> },
    { id: "value", header: t("field.value"), align: "right", cell: (i) => <MoneyText paisa={i.valuePaisa} /> },
    { id: "note", header: t("field.note"), hidden: !counted, cell: (i) => <span className="text-sm text-muted-foreground">{i.note ?? ""}</span> },
  ];
  return <DataTable rows={dispatch.items} columns={columns} getRowId={(i) => i.id} clientPageSize={0} empty={{ title: t("procurement.common.noMaterials") }} />;
}

function DispatchBody({ dispatch }: { dispatch: Dispatch }) {
  const t = useT();
  const readOnly = useReadOnly();
  const office = useCan("procurement.dispatch.create") && !readOnly;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancel, { isLoading }] = useCancelDispatchMutation();
  const run = useMutationToast();
  return (
    <>
      <PageHeader
        title={dispatch.number}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.dispatches"), href: BASE }, { label: dispatch.number }]}
        actions={
          office && dispatch.status === "ON_THE_WAY" ? (
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              <XCircle data-icon="inline-start" />
              {t("procurement.dispatch.cancel")}
            </Button>
          ) : null
        }
      />
      <DocumentHeader
        title={t("procurement.common.gatePass")}
        number={dispatch.number}
        status={
          <span className="flex flex-wrap gap-1">
            <StatusBadge domain="dispatch" value={dispatch.status} />
            {dispatch.lateSync ? <LateSyncBadge /> : null}
          </span>
        }
        locked={dispatch.status !== "ON_THE_WAY"}
        party={t("procurement.common.route", { from: place(t, dispatch.from), to: place(t, dispatch.to) })}
        meta={[
          { label: t("field.sent"), value: formatDateTime(dispatch.dispatchedAt) },
          { label: t("procurement.common.vehicle"), value: dispatch.vehicleNo },
          { label: t("procurement.common.driver"), value: [dispatch.driverName, dispatch.driverPhone ? formatPhone(dispatch.driverPhone) : null].filter(Boolean).join(" · ") || null },
          { label: t("field.value"), value: <MoneyText paisa={dispatch.totalValuePaisa} /> },
          { label: t("field.received"), value: dispatch.receivedAt ? `${formatDateTime(dispatch.receivedAt)} · ${dispatch.receivedBy?.name ?? ""}` : null },
          { label: t("procurement.dispatch.sentBy"), value: dispatch.createdBy?.name },
          { label: t("field.note"), value: dispatch.note },
        ]}
      />
      <SectionCard title={t("field.materials")} flush>
        <DispatchItemsTable dispatch={dispatch} />
      </SectionCard>
      {dispatch.shortages.length ? (
        <SectionCard title={t("procurement.dispatch.shortagesFound")}>
          <ul className="divide-y text-sm">
            {dispatch.shortages.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  <StatusBadge domain="shortageKind" value={s.kind} />
                  {formatQty(s.qty, s.material.unit)} {s.material.name}
                </span>
                <span className="flex items-center gap-2">
                  <MoneyText paisa={s.valuePaisa} />
                  <StatusBadge domain="shortage" value={s.status} />
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("procurement.common.cancelTitle", { number: dispatch.number })}
        description={t("procurement.dispatch.cancelDesc")}
        confirmLabel={t("procurement.dispatch.cancel")}
        loading={isLoading}
        onConfirm={async () => {
          const ok = await run(() => cancel(dispatch.id).unwrap(), { success: t("procurement.common.cancelled", { number: dispatch.number }) });
          if (ok) setCancelOpen(false);
        }}
      />
    </>
  );
}

export function DispatchDetailView({ dispatchId }: { dispatchId: string }) {
  const query = useGetDispatchQuery(dispatchId);
  return <QueryState query={query}>{(d) => <DispatchBody dispatch={d} />}</QueryState>;
}
