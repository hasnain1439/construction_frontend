"use client";

import { ArrowLeftRight, History, PackageCheck, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCancelEquipmentTransferMutation,
  useGetEquipmentMovementsQuery,
  useGetEquipmentTransferQuery,
  useGetEquipmentTransfersQuery,
} from "@/api/services/equipment.api";
import type {
  EquipmentMovement,
  EquipmentMovementsQuery,
  EquipmentTransfer,
  EquipmentTransfersQuery,
  Paginated,
  TransferItem,
} from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteProjectOptions } from "@/features/procurement/options";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDateTime } from "@/lib/dates";
import { formatQty, formatSignedQty } from "@/lib/quantity";
import { ReceiveTransferSlideOver, NewTransferSlideOver } from "../components/TransferSlideOvers";
import { placeName } from "../options";

const BASE = "/equipment/movements";
const TRANSFER_STATUSES = ["ON_THE_WAY", "RECEIVED", "RECEIVED_WITH_GAP", "CANCELLED"] as const;
const TRANSFER_KINDS = ["DISPATCH", "TRANSFER", "RETURN"] as const;
const MOVEMENT_TYPES = [
  "OPENING_IN",
  "PURCHASE_IN",
  "TRANSFER_OUT",
  "TRANSIT_IN",
  "TRANSIT_OUT",
  "RECEIPT_IN",
  "RENTAL_IN",
  "RENTAL_RETURN_OUT",
  "LOSS_OUT",
  "ADJUSTMENT",
] as const;

/** "40 nos Steel plate, 1 Mixer" (sent quantities hidden during a blind count). */
export const itemsSummary = (items: TransferItem[]) =>
  items
    .map((i) =>
      i.sentQty !== undefined
        ? `${formatQty(i.sentQty, i.equipment.unit)} ${i.equipment.name}`
        : i.equipment.name,
    )
    .join(", ");

export function useTransferColumns(): Column<EquipmentTransfer>[] {
  const t = useT();
  const te = useEnumT();
  return [
    {
      id: "number",
      header: t("equipment.col.number"),
      cell: (d) => <span className="tabular font-medium">{d.number}</span>,
    },
    {
      id: "date",
      header: t("field.sent"),
      cell: (d) => formatDateTime(d.sentAt),
      sortValue: (d) => d.sentAt,
    },
    { id: "kind", header: t("field.type"), cell: (d) => te("equipmentTransferKind", d.kind) },
    {
      id: "route",
      header: t("equipment.col.route"),
      cell: (d) => t("procurement.common.route", { from: placeName(t, d.from), to: placeName(t, d.to) }),
    },
    { id: "items", header: t("equipment.common.items"), cell: (d) => itemsSummary(d.items) },
    {
      id: "status",
      header: t("field.status"),
      cell: (d) => <StatusBadge domain="equipmentTransfer" value={d.status} />,
    },
  ];
}

/** Ledger rows (append-only): every in / out at a location. */
export function MovementLogTable({
  data,
  loading,
  error,
  onRetry,
  page,
  onPageChange,
  hideEquipment,
}: {
  data: Paginated<EquipmentMovement> | undefined;
  loading: boolean;
  error?: unknown;
  onRetry?: () => unknown;
  page: number;
  onPageChange: (page: number) => void;
  hideEquipment?: boolean;
}) {
  const t = useT();
  const te = useEnumT();
  const columns: Column<EquipmentMovement>[] = [
    { id: "when", header: t("field.date"), cell: (m) => formatDateTime(m.occurredAt) },
    { id: "type", header: t("field.type"), cell: (m) => te("equipmentMovementType", m.type) },
    {
      id: "equipment",
      header: t("equipment.field.equipment"),
      hidden: hideEquipment,
      cell: (m) => <span className="font-medium">{m.equipment.name}</span>,
    },
    { id: "place", header: t("equipment.field.location"), cell: (m) => placeName(t, m.location) },
    {
      id: "rental",
      header: t("equipment.col.rental"),
      cell: (m) => m.rental?.number ?? t("equipment.common.owned"),
    },
    {
      id: "qty",
      header: t("field.quantity"),
      align: "right",
      cell: (m) => (
        <span className={m.quantity < 0 ? "tabular text-danger" : "tabular text-success"}>
          {formatSignedQty(m.quantity, m.equipment.unit)}
        </span>
      ),
    },
    { id: "by", header: t("field.by"), cell: (m) => m.createdBy?.name ?? "—" },
    {
      id: "note",
      header: t("field.note"),
      cell: (m) => <span dir="auto" className="text-sm text-muted-foreground">{m.note ?? ""}</span>,
    },
  ];
  return (
    <DataTable
      rows={data?.items}
      columns={columns}
      getRowId={(m) => m.id}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={{ title: t("equipment.movements.logEmpty"), icon: History }}
      pagination={data ? { page, pageSize: 25, total: data.meta.total, onPageChange } : undefined}
    />
  );
}

function MovementLog() {
  const t = useT();
  const te = useEnumT();
  const projects = useSiteProjectOptions();
  const list = useListState({ type: "", projectId: "", from: "", to: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetEquipmentMovementsQuery(
    list.query as EquipmentMovementsQuery,
  );
  return (
    <>
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label={t("field.type")}
          value={list.filters.type}
          onChange={(v) => list.setFilter("type", v)}
          options={MOVEMENT_TYPES.map((value) => ({ value, label: te("equipmentMovementType", value) }))}
        />
        <FilterSelect
          label={t("field.site")}
          value={list.filters.projectId}
          onChange={(v) => list.setFilter("projectId", v)}
          options={projects.options.map((o) => ({ value: o.value, label: o.label }))}
        />
        <DateRangePicker
          value={{ from: list.filters.from, to: list.filters.to }}
          onChange={(r) => {
            list.setFilter("from", r.from);
            list.setFilter("to", r.to);
          }}
        />
      </FilterBar>
      <SectionCard flush>
        <MovementLogTable
          data={data}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          page={list.page}
          onPageChange={list.setPage}
        />
      </SectionCard>
    </>
  );
}

function TransfersList() {
  const t = useT();
  const ts = useStatusT();
  const te = useEnumT();
  const router = useRouter();
  const projects = useSiteProjectOptions();
  const list = useListState({ status: "", kind: "", projectId: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetEquipmentTransfersQuery(
    list.query as EquipmentTransfersQuery,
  );
  const columns = useTransferColumns();
  return (
    <>
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={TRANSFER_STATUSES.map((value) => ({ value, label: ts("equipmentTransfer", value) }))}
        />
        <FilterSelect
          label={t("field.type")}
          value={list.filters.kind}
          onChange={(v) => list.setFilter("kind", v)}
          options={TRANSFER_KINDS.map((value) => ({ value, label: te("equipmentTransferKind", value) }))}
        />
        <FilterSelect
          label={t("field.site")}
          value={list.filters.projectId}
          onChange={(v) => list.setFilter("projectId", v)}
          options={projects.options.map((o) => ({ value: o.value, label: o.label }))}
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
          empty={{
            title: t("equipment.transfer.emptyTitle"),
            description: t("equipment.transfer.emptyDesc"),
            icon: Truck,
          }}
          pagination={
            data
              ? {
                  page: list.page,
                  pageSize: list.pageSize,
                  total: data.meta.total,
                  onPageChange: list.setPage,
                  onPageSizeChange: list.setPageSize,
                }
              : undefined
          }
        />
      </SectionCard>
    </>
  );
}

export function MovementsView() {
  const t = useT();
  const readOnly = useReadOnly();
  const canSend = useCan("equipment.transfer.create") && !readOnly;
  const [newOpen, setNewOpen] = useState(false);
  return (
    <>
      <PageHeader
        title={t("equipment.movements.title")}
        description={t("equipment.movements.desc")}
        breadcrumbs={[{ label: t("crumb.equipment") }, { label: t("equipment.crumb.movements") }]}
        actions={
          canSend ? (
            <Button onClick={() => setNewOpen(true)}>
              <ArrowLeftRight data-icon="inline-start" />
              {t("equipment.transfer.new")}
            </Button>
          ) : null
        }
      />
      <Tabs defaultValue="transfers" className="gap-5">
        <TabsList>
          <TabsTrigger value="transfers">{t("equipment.movements.tabTransfers")}</TabsTrigger>
          <TabsTrigger value="log">{t("equipment.movements.tabLog")}</TabsTrigger>
        </TabsList>
        <TabsContent value="transfers" className="space-y-4">
          <TransfersList />
        </TabsContent>
        <TabsContent value="log" className="space-y-4">
          <MovementLog />
        </TabsContent>
      </Tabs>
      <NewTransferSlideOver open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}

/** Sent vs received per item after the count. */
export function TransferItemsTable({ transfer }: { transfer: EquipmentTransfer }) {
  const t = useT();
  const counted = transfer.status === "RECEIVED" || transfer.status === "RECEIVED_WITH_GAP";
  const columns: Column<TransferItem>[] = [
    {
      id: "equipment",
      header: t("equipment.field.equipment"),
      cell: (i) => (
        <span>
          <span className="font-medium">{i.equipment.name}</span>
          <span className="block text-xs text-muted-foreground">
            {i.rental?.number ?? t("equipment.common.owned")}
          </span>
        </span>
      ),
    },
    {
      id: "sent",
      header: t("field.sent"),
      align: "right",
      hidden: transfer.blindCount,
      cell: (i) => formatQty(i.sentQty ?? null, i.equipment.unit),
    },
    {
      id: "received",
      header: t("field.received"),
      align: "right",
      hidden: !counted,
      cell: (i) => formatQty(i.receivedQty, i.equipment.unit),
    },
    {
      id: "damaged",
      header: t("field.damaged"),
      align: "right",
      hidden: !counted,
      cell: (i) => (i.damagedQty ? formatQty(i.damagedQty, i.equipment.unit) : "—"),
    },
    {
      id: "gap",
      header: t("equipment.col.gap"),
      align: "right",
      hidden: !counted,
      cell: (i) =>
        i.gapQty ? (
          <span className="tabular font-medium text-danger">{formatQty(i.gapQty, i.equipment.unit)}</span>
        ) : (
          "—"
        ),
    },
    {
      id: "note",
      header: t("field.note"),
      hidden: !counted,
      cell: (i) => <span dir="auto" className="text-sm text-muted-foreground">{i.note ?? ""}</span>,
    },
    {
      id: "photo",
      header: t("field.photo"),
      hidden: !counted,
      cell: (i) =>
        i.photoUrl ? (
          <a href={i.photoUrl} target="_blank" rel="noreferrer" className="text-primary underline">
            {t("equipment.common.openPhoto")}
          </a>
        ) : null,
    },
  ];
  return (
    <DataTable
      rows={transfer.items}
      columns={columns}
      getRowId={(i) => i.id}
      clientPageSize={0}
      empty={{ title: t("equipment.common.noItems") }}
    />
  );
}

function TransferBody({ transfer }: { transfer: EquipmentTransfer }) {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const canSend = useCan("equipment.transfer.create") && !readOnly;
  const canReceive = useCan("equipment.receiving.create") && !readOnly;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [cancel, { isLoading }] = useCancelEquipmentTransferMutation();
  const run = useMutationToast();
  const onTheWay = transfer.status === "ON_THE_WAY";
  return (
    <>
      <PageHeader
        title={transfer.number}
        breadcrumbs={[
          { label: t("crumb.equipment") },
          { label: t("equipment.crumb.movements"), href: BASE },
          { label: transfer.number },
        ]}
        actions={
          onTheWay ? (
            <span className="flex flex-wrap gap-2">
              {canSend ? (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  <XCircle data-icon="inline-start" />
                  {t("equipment.transfer.cancel")}
                </Button>
              ) : null}
              {canReceive ? (
                <Button onClick={() => setReceiveOpen(true)}>
                  <PackageCheck data-icon="inline-start" />
                  {t("equipment.receive.action")}
                </Button>
              ) : null}
            </span>
          ) : null
        }
      />
      <DocumentHeader
        title={te("equipmentTransferKind", transfer.kind)}
        number={transfer.number}
        status={<StatusBadge domain="equipmentTransfer" value={transfer.status} />}
        locked={!onTheWay}
        party={t("procurement.common.route", {
          from: placeName(t, transfer.from),
          to: placeName(t, transfer.to),
        })}
        meta={[
          { label: t("field.sent"), value: formatDateTime(transfer.sentAt) },
          { label: t("procurement.common.vehicle"), value: transfer.vehicleNo },
          { label: t("procurement.common.driver"), value: transfer.driverName },
          { label: t("equipment.transfer.sentBy"), value: transfer.createdBy?.name },
          {
            label: t("field.received"),
            value: transfer.receivedAt
              ? `${formatDateTime(transfer.receivedAt)} · ${transfer.receivedBy?.name ?? ""}`
              : null,
          },
          {
            label: t("field.note"),
            value: [transfer.note, transfer.receiveNote].filter(Boolean).join(" · ") || null,
          },
        ]}
      />
      <SectionCard title={t("equipment.common.items")} flush>
        <TransferItemsTable transfer={transfer} />
      </SectionCard>
      {transfer.losses.length ? (
        <SectionCard
          title={t("equipment.transfer.lossesFound")}
          actions={
            <Link href="/equipment/loss-damage" className="text-sm text-primary underline">
              {t("equipment.crumb.loss")}
            </Link>
          }
        >
          <ul className="divide-y text-sm">
            {transfer.losses.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 py-2">
                <StatusBadge domain="equipmentLossKind" value={l.kind} />
                <span className="tabular font-medium">{l.number}</span>
                <span>{formatQty(l.qty)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("equipment.transfer.cancelTitle", { number: transfer.number })}
        description={t("equipment.transfer.cancelDesc")}
        confirmLabel={t("equipment.transfer.cancel")}
        loading={isLoading}
        onConfirm={async () => {
          const ok = await run(() => cancel(transfer.id).unwrap(), {
            success: t("equipment.transfer.cancelledToast", { number: transfer.number }),
          });
          if (ok) setCancelOpen(false);
        }}
      />
      <ReceiveTransferSlideOver
        transfer={receiveOpen ? transfer : null}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
      />
    </>
  );
}

export function TransferDetailView({ transferId }: { transferId: string }) {
  const query = useGetEquipmentTransferQuery(transferId);
  return <QueryState query={query}>{(d) => <TransferBody transfer={d} />}</QueryState>;
}
