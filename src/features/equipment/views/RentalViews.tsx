"use client";

import { CalendarPlus, Handshake, Lock, Plus, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetRentalQuery, useGetRentalsQuery } from "@/api/services/equipment.api";
import type { Rental, RentalItem, RentalReturn, RentalsQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useSiteProjectOptions, useSupplierOptions } from "@/features/procurement/options";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useStatusT, useT } from "@/i18n/useT";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import {
  CloseRentalSlideOver,
  ExtendRentalSlideOver,
  NewRentalSlideOver,
  ReturnRentalSlideOver,
} from "../components/RentalSlideOvers";
import { placeName, useSeesRates } from "../options";
import { IdleEquipmentPanel } from "./IdleEquipmentPanel";

const BASE = "/equipment/rentals";
const RENTAL_STATUSES = ["ACTIVE", "RETURNED", "CLOSED"] as const;

/** Status badge + "Overdue" when an active rental is past its expected end. */
export function RentalStatus({ rental }: { rental: Pick<Rental, "status" | "overdue"> }) {
  const t = useT();
  return (
    <span className="flex flex-wrap gap-1">
      <StatusBadge domain="rental" value={rental.status} />
      {rental.overdue ? <StatusBadge tone="danger" label={t("equipment.rental.overdue")} /> : null}
    </span>
  );
}

export function useRentalColumns(): Column<Rental>[] {
  const t = useT();
  const rates = useSeesRates();
  return [
    {
      id: "number",
      header: t("equipment.col.number"),
      cell: (r) => <span className="tabular font-medium">{r.number}</span>,
    },
    { id: "supplier", header: t("equipment.field.yardSupplier"), cell: (r) => r.supplier.name },
    {
      id: "where",
      header: t("equipment.field.location"),
      cell: (r) => (r.project ? r.project.name : placeName(t, r.location)),
    },
    {
      id: "start",
      header: t("equipment.field.startDate"),
      cell: (r) => formatDate(r.startDate),
      sortValue: (r) => r.startDate,
    },
    {
      id: "end",
      header: t("equipment.field.expectedEndDate"),
      cell: (r) => formatDate(r.returnedDate ?? r.expectedEndDate),
    },
    { id: "days", header: t("equipment.col.days"), align: "right", cell: (r) => r.daysOnRent },
    {
      id: "items",
      header: t("equipment.common.items"),
      cell: (r) =>
        r.items
          .map((i) => `${formatQty(i.outstandingQty || i.qty, i.equipment.unit)} ${i.equipment.name}`)
          .join(", "),
    },
    {
      id: "accrued",
      header: t("equipment.col.accrued"),
      align: "right",
      hidden: !rates,
      cell: (r) => <MoneyText paisa={r.accruedToDatePaisa} />,
    },
    { id: "status", header: t("field.status"), cell: (r) => <RentalStatus rental={r} /> },
  ];
}

export function RentalsView() {
  const t = useT();
  const ts = useStatusT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const canManage = useCan("equipment.rental.manage") && !readOnly;
  const suppliers = useSupplierOptions();
  const projects = useSiteProjectOptions();
  const list = useListState({ status: "ACTIVE", supplierId: "", projectId: "", overdue: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetRentalsQuery(list.query as RentalsQuery);
  const columns = useRentalColumns();
  const [newOpen, setNewOpen] = useState(false);
  return (
    <>
      <PageHeader
        title={t("equipment.rental.title")}
        description={t("equipment.rental.desc")}
        breadcrumbs={[{ label: t("crumb.equipment") }, { label: t("equipment.crumb.rentals") }]}
        actions={
          canManage ? (
            <Button onClick={() => setNewOpen(true)}>
              <Plus data-icon="inline-start" />
              {t("equipment.rental.new")}
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={RENTAL_STATUSES.map((value) => ({ value, label: ts("rental", value) }))}
        />
        <FilterSelect
          label={t("equipment.field.yardSupplier")}
          value={list.filters.supplierId}
          onChange={(v) => list.setFilter("supplierId", v)}
          options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))}
        />
        <FilterSelect
          label={t("field.site")}
          value={list.filters.projectId}
          onChange={(v) => list.setFilter("projectId", v)}
          options={projects.options.map((o) => ({ value: o.value, label: o.label }))}
        />
        <FilterSelect
          label={t("equipment.rental.overdue")}
          value={list.filters.overdue}
          onChange={(v) => list.setFilter("overdue", v)}
          options={[{ value: "true", label: t("equipment.rental.onlyOverdue") }]}
        />
      </FilterBar>
      <IdleEquipmentPanel projectId={list.filters.projectId || undefined} />
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(r) => router.push(`${BASE}/${r.id}`)}
          empty={{
            title: t("equipment.rental.emptyTitle"),
            description: t("equipment.rental.emptyDesc"),
            icon: Handshake,
            action:
              canManage && !list.isFiltered ? (
                <Button variant="outline" onClick={() => setNewOpen(true)}>
                  <Plus data-icon="inline-start" />
                  {t("equipment.rental.new")}
                </Button>
              ) : undefined,
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
      <NewRentalSlideOver open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}

function RentalBody({ rental }: { rental: Rental }) {
  const t = useT();
  const rates = useSeesRates();
  const readOnly = useReadOnly();
  const canManage = useCan("equipment.rental.manage") && !readOnly;
  const [open, setOpen] = useState<"extend" | "return" | "close" | null>(null);
  const itemColumns: Column<RentalItem>[] = [
    {
      id: "equipment",
      header: t("equipment.field.equipment"),
      cell: (i) => <span className="font-medium">{i.equipment.name}</span>,
    },
    {
      id: "qty",
      header: t("equipment.col.hired"),
      align: "right",
      cell: (i) => formatQty(i.qty, i.equipment.unit),
    },
    {
      id: "returned",
      header: t("equipment.col.returned"),
      align: "right",
      cell: (i) => formatQty(i.returnedQty, i.equipment.unit),
    },
    {
      id: "missing",
      header: t("equipment.rental.missing"),
      align: "right",
      cell: (i) => (i.missingQty ? formatQty(i.missingQty, i.equipment.unit) : "—"),
    },
    {
      id: "outstanding",
      header: t("equipment.col.outstanding"),
      align: "right",
      cell: (i) => (
        <span className="tabular font-semibold">{formatQty(i.outstandingQty, i.equipment.unit)}</span>
      ),
    },
    {
      id: "rate",
      header: t("equipment.field.ratePerDay"),
      align: "right",
      hidden: !rates,
      cell: (i) => <MoneyText paisa={i.ratePaisaPerDay} />,
    },
  ];
  const returnColumns: Column<RentalReturn>[] = [
    { id: "date", header: t("equipment.field.returnDate"), cell: (r) => formatDate(r.returnDate) },
    {
      id: "items",
      header: t("equipment.common.items"),
      cell: (r) =>
        r.items
          .map((x) => {
            const item = rental.items.find((i) => i.id === x.rentalItemId);
            return item
              ? `${formatQty(x.qty, item.equipment.unit)} ${item.equipment.name}`
              : formatQty(x.qty);
          })
          .join(", "),
    },
    {
      id: "damage",
      header: t("equipment.field.damageCharges"),
      align: "right",
      hidden: !rates,
      cell: (r) => <MoneyText paisa={r.damageChargesPaisa} />,
    },
    {
      id: "note",
      header: t("field.note"),
      cell: (r) => <span className="text-sm text-muted-foreground">{r.note ?? ""}</span>,
    },
  ];
  return (
    <>
      <PageHeader
        title={rental.number}
        breadcrumbs={[
          { label: t("crumb.equipment") },
          { label: t("equipment.crumb.rentals"), href: BASE },
          { label: rental.number },
        ]}
        actions={
          canManage ? (
            <span className="flex flex-wrap gap-2">
              {rental.status === "ACTIVE" ? (
                <>
                  <Button variant="outline" onClick={() => setOpen("extend")}>
                    <CalendarPlus data-icon="inline-start" />
                    {t("equipment.rental.extend")}
                  </Button>
                  <Button onClick={() => setOpen("return")}>
                    <Undo2 data-icon="inline-start" />
                    {t("equipment.rental.return")}
                  </Button>
                </>
              ) : null}
              {rental.status === "RETURNED" ? (
                <Button onClick={() => setOpen("close")}>
                  <Lock data-icon="inline-start" />
                  {t("equipment.rental.close")}
                </Button>
              ) : null}
            </span>
          ) : null
        }
      />
      <DocumentHeader
        title={t("equipment.rental.docTitle")}
        number={rental.number}
        status={<RentalStatus rental={rental} />}
        locked={rental.status === "CLOSED"}
        party={rental.supplier.name}
        meta={[
          {
            label: t("equipment.field.location"),
            value: rental.project
              ? `${rental.project.name} · ${rental.project.code}`
              : placeName(t, rental.location),
          },
          { label: t("equipment.field.startDate"), value: formatDate(rental.startDate) },
          { label: t("equipment.field.expectedEndDate"), value: formatDate(rental.expectedEndDate) },
          {
            label: t("equipment.field.returnDate"),
            value: rental.returnedDate ? formatDate(rental.returnedDate) : null,
          },
          { label: t("equipment.col.days"), value: String(rental.daysOnRent) },
          ...(rates
            ? [
                { label: t("equipment.col.accrued"), value: <MoneyText paisa={rental.accruedToDatePaisa} /> },
                { label: t("equipment.rental.posted"), value: <MoneyText paisa={rental.postedPaisa} /> },
                { label: t("equipment.field.deposit"), value: <MoneyText paisa={rental.depositPaisa} /> },
                {
                  label: t("equipment.field.damageCharges"),
                  value: <MoneyText paisa={rental.damageChargesPaisa} />,
                },
                {
                  label: t("equipment.rental.rentCharged"),
                  value: <MoneyText paisa={rental.rentChargedPaisa} />,
                },
                {
                  label: t("equipment.field.depositRefund"),
                  value: <MoneyText paisa={rental.depositRefundedPaisa} />,
                },
              ]
            : []),
          { label: t("field.reference"), value: rental.reference },
          { label: t("field.note"), value: rental.note },
          {
            label: t("equipment.rental.closedAt"),
            value: rental.closedAt ? formatDateTime(rental.closedAt) : null,
          },
        ]}
      />
      <SectionCard title={t("equipment.common.items")} flush>
        <DataTable
          rows={rental.items}
          columns={itemColumns}
          getRowId={(i) => i.id}
          clientPageSize={0}
          empty={{ title: t("equipment.common.noItems") }}
        />
      </SectionCard>
      <SectionCard title={t("equipment.rental.returnsTitle")} flush>
        <DataTable
          rows={rental.returns}
          columns={returnColumns}
          getRowId={(r) => r.id}
          clientPageSize={0}
          empty={{ title: t("equipment.rental.noReturns") }}
        />
      </SectionCard>
      <ExtendRentalSlideOver
        rental={open === "extend" ? rental : null}
        open={open === "extend"}
        onOpenChange={(o) => !o && setOpen(null)}
      />
      <ReturnRentalSlideOver
        rental={open === "return" ? rental : null}
        open={open === "return"}
        onOpenChange={(o) => !o && setOpen(null)}
      />
      <CloseRentalSlideOver
        rental={open === "close" ? rental : null}
        open={open === "close"}
        onOpenChange={(o) => !o && setOpen(null)}
      />
    </>
  );
}

export function RentalDetailView({ rentalId }: { rentalId: string }) {
  const query = useGetRentalQuery(rentalId);
  return <QueryState query={query}>{(r) => <RentalBody rental={r} />}</QueryState>;
}
