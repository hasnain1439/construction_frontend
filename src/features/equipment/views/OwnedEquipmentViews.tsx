"use client";

import { Eye, Forklift, PackagePlus, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useGetEquipmentListQuery,
  useGetEquipmentMovementsQuery,
  useGetEquipmentQuery,
} from "@/api/services/equipment.api";
import type { Equipment, EquipmentDetail, EquipmentMovementsQuery, EquipmentQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { formatQty } from "@/lib/quantity";
import { AdjustSlideOver, EquipmentFormSlideOver, StockInSlideOver } from "../components/EquipmentSlideOvers";
import { placeName, useCategoryOptions, useKindOptions, useSeesRates } from "../options";
import { MovementLogTable } from "./MovementViews";

const BASE = "/equipment/owned";

export function OwnedEquipmentView() {
  const t = useT();
  const te = useEnumT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const manage = useCan("equipment.manage") && !readOnly;
  const rates = useSeesRates();
  const categories = useCategoryOptions();
  const kinds = useKindOptions();
  const list = useListState({ category: "", kind: "", active: "true" });
  const { data, isLoading, isFetching, error, refetch } = useGetEquipmentListQuery(
    list.query as EquipmentQuery,
  );
  const [form, setForm] = useState<{ open: boolean; equipment: Equipment | null }>({
    open: false,
    equipment: null,
  });
  const [stockIn, setStockIn] = useState<Equipment | null>(null);

  const columns: Column<Equipment>[] = [
    {
      id: "name",
      header: t("equipment.field.equipment"),
      cell: (e) => (
        <div>
          <p className="font-medium">{e.name}</p>
          <p className="text-xs text-muted-foreground">
            {[e.code, e.serialNo].filter(Boolean).join(" · ") || te("equipmentKind", e.kind)}
          </p>
        </div>
      ),
      sortValue: (e) => e.name,
    },
    { id: "category", header: t("field.category"), cell: (e) => te("equipmentCategory", e.category) },
    {
      id: "owned",
      header: t("equipment.col.owned"),
      align: "right",
      cell: (e) => formatQty(e.ownedQty, e.unit),
      sortValue: (e) => e.ownedQty,
    },
    {
      id: "rented",
      header: t("equipment.col.onRent"),
      align: "right",
      cell: (e) => (e.rentedQty ? formatQty(e.rentedQty, e.unit) : "—"),
    },
    // Where the units are: own + rented, so Owned + On rent = At sites + Yard + In transit (QA-C-06).
    {
      id: "sites",
      header: t("equipment.qaFixes.atSitesAll"),
      align: "right",
      cell: (e) => formatQty(e.atSitesQty, e.unit),
    },
    {
      id: "yard",
      header: t("equipment.qaFixes.yardAll"),
      align: "right",
      cell: (e) => formatQty(e.atYardQty, e.unit),
    },
    {
      id: "transit",
      header: t("equipment.common.inTransit"),
      align: "right",
      cell: (e) => (e.inTransitQty ? formatQty(e.inTransitQty, e.unit) : "—"),
    },
    {
      id: "hire",
      header: t("equipment.field.hireRate"),
      align: "right",
      hidden: !rates,
      cell: (e) => <MoneyText paisa={e.hireRatePaisaPerDay} />,
    },
    {
      id: "value",
      header: t("equipment.field.replacementValue"),
      align: "right",
      hidden: !rates,
      cell: (e) => <MoneyText paisa={e.replacementValuePaisa} />,
    },
    {
      id: "status",
      header: t("field.status"),
      cell: (e) => <StatusBadge domain="active" value={e.isActive} />,
    },
    {
      ...ACTIONS_COLUMN,
      cell: (e) => (
        <RowActions
          name={e.name}
          actions={[
            { label: t("common.view"), icon: Eye, href: `${BASE}/${e.id}` },
            {
              label: t("common.edit"),
              icon: Pencil,
              hidden: !manage,
              onSelect: () => setForm({ open: true, equipment: e }),
            },
            {
              label: t("equipment.stockIn.title"),
              icon: PackagePlus,
              hidden: !manage,
              onSelect: () => setStockIn(e),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("equipment.register.title")}
        description={t("equipment.register.desc")}
        breadcrumbs={[{ label: t("crumb.equipment") }, { label: t("equipment.crumb.owned") }]}
        actions={
          manage ? (
            <Button onClick={() => setForm({ open: true, equipment: null })}>
              <Plus data-icon="inline-start" />
              {t("equipment.register.add")}
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput
          value={list.search}
          onChange={list.setSearch}
          placeholder={t("equipment.register.searchPlaceholder")}
        />
        <FilterSelect
          label={t("field.category")}
          value={list.filters.category}
          onChange={(v) => list.setFilter("category", v)}
          options={categories}
        />
        <FilterSelect
          label={t("equipment.field.kind")}
          value={list.filters.kind}
          onChange={(v) => list.setFilter("kind", v)}
          options={kinds}
        />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.active}
          onChange={(v) => list.setFilter("active", v)}
          options={[
            { value: "true", label: t("common.active") },
            { value: "false", label: t("common.inactive") },
          ]}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(e) => e.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(e) => router.push(`${BASE}/${e.id}`)}
          empty={{
            title: t("equipment.register.emptyTitle"),
            description: t("equipment.register.emptyDesc"),
            icon: Forklift,
            action:
              manage && !list.isFiltered ? (
                <Button variant="outline" onClick={() => setForm({ open: true, equipment: null })}>
                  <Plus data-icon="inline-start" />
                  {t("equipment.register.add")}
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
      <EquipmentFormSlideOver
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        equipment={form.equipment}
      />
      <StockInSlideOver
        open={Boolean(stockIn)}
        onOpenChange={(open) => !open && setStockIn(null)}
        equipment={stockIn}
      />
    </>
  );
}

function EquipmentBody({ equipment }: { equipment: EquipmentDetail }) {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const manage = useCan("equipment.manage") && !readOnly;
  const rates = useSeesRates();
  const [editOpen, setEditOpen] = useState(false);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [page, setPage] = useState(1);
  const movements = useGetEquipmentMovementsQuery({
    equipmentId: equipment.id,
    page,
    limit: 25,
  } as EquipmentMovementsQuery);
  const locationColumns: Column<EquipmentDetail["locations"][number]>[] = [
    {
      id: "place",
      header: t("equipment.field.location"),
      cell: (l) => <span className="font-medium">{placeName(t, l.location)}</span>,
    },
    {
      id: "owned",
      header: t("equipment.col.owned"),
      align: "right",
      cell: (l) => formatQty(l.ownedQty, equipment.unit),
    },
    {
      id: "rented",
      header: t("equipment.col.onRent"),
      align: "right",
      cell: (l) => (l.rentedQty ? formatQty(l.rentedQty, equipment.unit) : "—"),
    },
  ];
  return (
    <>
      <PageHeader
        title={equipment.name}
        breadcrumbs={[
          { label: t("crumb.equipment") },
          { label: t("equipment.crumb.owned"), href: BASE },
          { label: equipment.name },
        ]}
        actions={
          manage ? (
            <span className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil data-icon="inline-start" />
                {t("common.edit")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setAdjustOpen(true)}
                disabled={!equipment.locations.length}
              >
                <SlidersHorizontal data-icon="inline-start" />
                {t("equipment.adjust.title")}
              </Button>
              <Button onClick={() => setStockInOpen(true)}>
                <PackagePlus data-icon="inline-start" />
                {t("equipment.stockIn.title")}
              </Button>
            </span>
          ) : null
        }
      />
      <DocumentHeader
        title={te("equipmentCategory", equipment.category)}
        number={equipment.code ?? equipment.name}
        status={<StatusBadge domain="active" value={equipment.isActive} />}
        party={te("equipmentKind", equipment.kind)}
        meta={[
          { label: t("equipment.col.owned"), value: formatQty(equipment.ownedQty, equipment.unit) },
          { label: t("equipment.col.onRent"), value: formatQty(equipment.rentedQty, equipment.unit) },
          { label: t("equipment.qaFixes.atSitesAll"), value: formatQty(equipment.atSitesQty, equipment.unit) },
          { label: t("equipment.qaFixes.yardAll"), value: formatQty(equipment.atYardQty, equipment.unit) },
          {
            label: t("equipment.common.inTransit"),
            value: formatQty(equipment.inTransitQty, equipment.unit),
          },
          ...(rates
            ? [
                {
                  label: t("equipment.field.hireRate"),
                  value: <MoneyText paisa={equipment.hireRatePaisaPerDay} />,
                },
                {
                  label: t("equipment.field.replacementValue"),
                  value: <MoneyText paisa={equipment.replacementValuePaisa} />,
                },
              ]
            : []),
          { label: t("equipment.field.serialNo"), value: equipment.serialNo },
          {
            label: t("equipment.field.coverage"),
            value:
              equipment.coverageSqftPerUnit !== null
                ? `${formatQty(equipment.coverageSqftPerUnit)} ${t("field.sqft")}`
                : null,
          },
          { label: t("field.notes"), value: equipment.notes },
        ]}
      />
      <SectionCard title={t("equipment.register.whereNow")} flush>
        <DataTable
          rows={equipment.locations}
          columns={locationColumns}
          getRowId={(l) => l.location.id}
          clientPageSize={0}
          empty={{ title: t("equipment.register.nowhere") }}
        />
      </SectionCard>
      <SectionCard title={t("equipment.movements.logTitle")} flush>
        <MovementLogTable
          data={movements.data}
          loading={movements.isLoading || movements.isFetching}
          error={movements.error}
          onRetry={movements.refetch}
          page={page}
          onPageChange={setPage}
          hideEquipment
        />
      </SectionCard>
      <EquipmentFormSlideOver open={editOpen} onOpenChange={setEditOpen} equipment={equipment} />
      <StockInSlideOver open={stockInOpen} onOpenChange={setStockInOpen} equipment={equipment} />
      <AdjustSlideOver open={adjustOpen} onOpenChange={setAdjustOpen} equipment={equipment} />
    </>
  );
}

export function EquipmentDetailView({ equipmentId }: { equipmentId: string }) {
  const query = useGetEquipmentQuery(equipmentId);
  return <QueryState query={query}>{(e) => <EquipmentBody equipment={e} />}</QueryState>;
}
