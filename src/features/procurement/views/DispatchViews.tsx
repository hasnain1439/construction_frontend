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
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { formatQty } from "@/lib/quantity";
import { NewDispatchSlideOver } from "../components/DispatchSlideOvers";
import { useSiteProjectOptions } from "../options";

const BASE = "/suppliers-stock/dispatches";
const place = (l: Dispatch["from"]) => (l.type === "STORE" ? "Central Store" : l.name);

export function DispatchesView() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const owner = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const projects = useSiteProjectOptions();
  const list = useListState({ status: "", projectId: "", from: "", to: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetDispatchesQuery(list.query as DispatchesQuery);
  const locations = useGetStockLocationsQuery();
  const store = locations.data?.find((l) => l.type === "STORE");
  const storeStock = useGetStoreStockQuery({ locationId: store?.id ?? "" }, { skip: !store || !owner });
  const available = useMemo(() => (storeStock.data?.items ?? []).map((i) => ({ materialId: i.material.id, qty: i.inStore, unit: i.material.unit })), [storeStock.data]);
  const [newOpen, setNewOpen] = useState(false);

  const columns: Column<Dispatch>[] = [
    { id: "number", header: "Gate pass", cell: (d) => <span className="font-medium tabular">{d.number}</span> },
    { id: "date", header: "Sent", cell: (d) => formatDateTime(d.dispatchedAt), sortValue: (d) => d.dispatchedAt },
    { id: "route", header: "From → to", cell: (d) => `${place(d.from)} → ${place(d.to)}` },
    { id: "items", header: "Materials", cell: (d) => d.items.map((i) => (i.sentQty !== undefined ? `${formatQty(i.sentQty, i.material.unit)} ${i.material.name}` : i.material.name)).join(", ") },
    { id: "vehicle", header: "Vehicle / driver", cell: (d) => [d.vehicleNo, d.driverName].filter(Boolean).join(" · ") || "—" },
    { id: "value", header: "Value", align: "right", cell: (d) => <MoneyText paisa={d.totalValuePaisa} /> },
    { id: "status", header: "Status", cell: (d) => <StatusBadge domain="dispatch" value={d.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Dispatches (Sent to Sites)"
        description="Gate passes. Stock is on the way until the site counts it."
        breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Dispatches" }]}
        actions={
          owner && store ? (
            <Button onClick={() => setNewOpen(true)}>
              <Truck data-icon="inline-start" />
              New dispatch
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="GP number or vehicle…" />
        <FilterSelect
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "ON_THE_WAY", label: "On the way" },
            { value: "RECEIVED", label: "Received" },
            { value: "RECEIVED_WITH_SHORTAGE", label: "Received — short" },
            { value: "RECEIVED_WITH_EXCESS", label: "Received — excess" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <FilterSelect label="Site" value={list.filters.projectId} onChange={(v) => list.setFilter("projectId", v)} options={projects.options.map((o) => ({ value: o.value, label: o.label }))} />
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
          empty={{ title: "No dispatches yet", description: "Send stock from the store to a site with a gate pass.", icon: Truck }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
      {store ? (
        <NewDispatchSlideOver open={newOpen} onOpenChange={setNewOpen} fromOptions={[{ value: store.id, label: "Central Store" }]} defaultFromId={store.id} available={available} />
      ) : null}
    </>
  );
}

/** Sent vs received per material (after the count), with the difference badge. */
export function DispatchItemsTable({ dispatch }: { dispatch: Dispatch }) {
  const counted = dispatch.status !== "ON_THE_WAY" && dispatch.status !== "CANCELLED";
  const columns: Column<DispatchItem>[] = [
    { id: "material", header: "Material", cell: (i) => <span className="font-medium">{i.material.name}</span> },
    { id: "sent", header: "Sent", align: "right", hidden: dispatch.blindCount, cell: (i) => formatQty(i.sentQty ?? null, i.material.unit) },
    { id: "received", header: "Received", align: "right", hidden: !counted, cell: (i) => formatQty(i.receivedQty, i.material.unit) },
    { id: "damaged", header: "Damaged", align: "right", hidden: !counted, cell: (i) => (i.damagedQty ? formatQty(i.damagedQty, i.material.unit) : "—") },
    {
      id: "result",
      header: "Result",
      hidden: !counted,
      cell: (i) =>
        i.sentQty !== undefined && i.receivedQty !== null ? <DifferenceBadge expected={i.sentQty} counted={i.receivedQty} damaged={i.damagedQty ?? 0} difference={i.differenceQty} unit={i.material.unit} /> : null,
    },
    { id: "cost", header: "Avg cost", align: "right", cell: (i) => <MoneyText paisa={i.unitCostPaisa} /> },
    { id: "value", header: "Value", align: "right", cell: (i) => <MoneyText paisa={i.valuePaisa} /> },
    { id: "note", header: "Note", hidden: !counted, cell: (i) => <span className="text-sm text-muted-foreground">{i.note ?? ""}</span> },
  ];
  return <DataTable rows={dispatch.items} columns={columns} getRowId={(i) => i.id} clientPageSize={0} empty={{ title: "No materials" }} />;
}

function DispatchBody({ dispatch }: { dispatch: Dispatch }) {
  const readOnly = useReadOnly();
  const office = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancel, { isLoading }] = useCancelDispatchMutation();
  const run = useMutationToast();
  return (
    <>
      <PageHeader
        title={dispatch.number}
        breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Dispatches", href: BASE }, { label: dispatch.number }]}
        actions={
          office && dispatch.status === "ON_THE_WAY" ? (
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              <XCircle data-icon="inline-start" />
              Cancel dispatch
            </Button>
          ) : null
        }
      />
      <DocumentHeader
        title="Gate pass"
        number={dispatch.number}
        status={<StatusBadge domain="dispatch" value={dispatch.status} />}
        locked={dispatch.status !== "ON_THE_WAY"}
        party={`${place(dispatch.from)} → ${place(dispatch.to)}`}
        meta={[
          { label: "Sent", value: formatDateTime(dispatch.dispatchedAt) },
          { label: "Vehicle", value: dispatch.vehicleNo },
          { label: "Driver", value: [dispatch.driverName, dispatch.driverPhone ? formatPhone(dispatch.driverPhone) : null].filter(Boolean).join(" · ") || null },
          { label: "Value", value: <MoneyText paisa={dispatch.totalValuePaisa} /> },
          { label: "Received", value: dispatch.receivedAt ? `${formatDateTime(dispatch.receivedAt)} · ${dispatch.receivedBy?.name ?? ""}` : null },
          { label: "Sent by", value: dispatch.createdBy?.name },
          { label: "Note", value: dispatch.note },
        ]}
      />
      <SectionCard title="Materials" flush>
        <DispatchItemsTable dispatch={dispatch} />
      </SectionCard>
      {dispatch.shortages.length ? (
        <SectionCard title="Shortages found">
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
        title={`Cancel ${dispatch.number}?`}
        description="The stock comes back to where it was sent from, at the same value. Do this only if the truck did not leave."
        confirmLabel="Cancel dispatch"
        loading={isLoading}
        onConfirm={async () => {
          const ok = await run(() => cancel(dispatch.id).unwrap(), { success: `${dispatch.number} cancelled` });
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
