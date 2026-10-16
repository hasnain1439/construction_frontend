"use client";

import { Building2, Forklift, Truck, Warehouse } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetEquipmentBalancesQuery } from "@/api/services/equipment.api";
import type { AllocationLocation, AllocationTotal, BalancesQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useT } from "@/i18n/useT";
import { projectHref } from "@/lib/navigation";
import { formatQty } from "@/lib/quantity";
import { placeName, useCategoryOptions } from "../options";

const ICONS = { STORE: Warehouse, TRANSIT: Truck, SITE: Building2 } as const;
/** Yard first, then sites by name, transit last. */
const ORDER = { STORE: 0, SITE: 1, TRANSIT: 2 } as const;

const sum = (rows: AllocationTotal[], pick: (r: AllocationTotal) => number) =>
  rows.reduce((s, r) => s + pick(r), 0);

/** One card per place: what is there, owned vs rented (with the rental numbers). */
export function LocationCard({ entry }: { entry: AllocationLocation }) {
  const t = useT();
  const Icon = ICONS[entry.location.type];
  const owned = entry.items.reduce((s, i) => s + i.ownedQty, 0);
  const rented = entry.items.reduce((s, i) => s + i.rentedQty, 0);
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-primary" aria-hidden />
          {entry.project ? (
            <Link href={projectHref(entry.project.id, "/site/equipment")} className="hover:underline">
              {placeName(t, entry.location)}
            </Link>
          ) : (
            placeName(t, entry.location)
          )}
        </span>
      }
      description={entry.project?.code}
      actions={
        <span className="flex flex-wrap gap-1">
          {owned ? (
            <StatusBadge tone="success" label={t("equipment.map.ownedCount", { n: formatQty(owned) })} />
          ) : null}
          {rented ? (
            <StatusBadge tone="info" label={t("equipment.map.rentedCount", { n: formatQty(rented) })} />
          ) : null}
        </span>
      }
    >
      <ul className="divide-y text-sm" data-testid={`location-${entry.location.id}`}>
        {entry.items.map((item) => (
          <li key={item.equipment.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="font-medium">{item.equipment.name}</span>
              {item.rentals.length ? (
                <span className="block text-xs text-muted-foreground">
                  {item.rentals
                    .map((r) =>
                      t("equipment.map.rentalLine", {
                        number: r.number,
                        qty: formatQty(r.qty, item.equipment.unit),
                      }),
                    )
                    .join(" · ")}
                </span>
              ) : null}
            </span>
            <span className="tabular text-end">
              <span className="block font-semibold">{formatQty(item.totalQty, item.equipment.unit)}</span>
              {item.rentedQty ? (
                <span className="block text-xs text-muted-foreground">
                  {t("equipment.map.split", {
                    owned: formatQty(item.ownedQty),
                    rented: formatQty(item.rentedQty),
                  })}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function AllocationMapView() {
  const t = useT();
  const categories = useCategoryOptions();
  const [category, setCategory] = useState("");
  const { data, isLoading, error, refetch } = useGetEquipmentBalancesQuery(
    (category ? { category } : undefined) as BalancesQuery | undefined,
  );
  const totals = data?.totals ?? [];
  const locations = [...(data?.locations ?? [])].sort(
    (a, b) =>
      ORDER[a.location.type] - ORDER[b.location.type] || a.location.name.localeCompare(b.location.name),
  );

  const columns: Column<AllocationTotal>[] = [
    {
      id: "name",
      header: t("equipment.field.equipment"),
      cell: (r) => <span className="font-medium">{r.equipment.name}</span>,
      sortValue: (r) => r.equipment.name,
    },
    {
      id: "owned",
      header: t("equipment.col.owned"),
      align: "right",
      cell: (r) => formatQty(r.ownedQty, r.equipment.unit),
      sortValue: (r) => r.ownedQty,
    },
    {
      id: "rented",
      header: t("equipment.col.onRent"),
      align: "right",
      cell: (r) => (r.rentedQty ? formatQty(r.rentedQty, r.equipment.unit) : "—"),
    },
    {
      id: "yard",
      header: t("equipment.common.yard"),
      align: "right",
      cell: (r) => formatQty(r.atYardQty, r.equipment.unit),
    },
    {
      id: "sites",
      header: t("equipment.col.atSites"),
      align: "right",
      cell: (r) => formatQty(r.atSitesQty, r.equipment.unit),
    },
    {
      id: "transit",
      header: t("equipment.common.inTransit"),
      align: "right",
      cell: (r) => (r.inTransitQty ? formatQty(r.inTransitQty, r.equipment.unit) : "—"),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("equipment.map.title")}
        description={t("equipment.map.desc")}
        breadcrumbs={[{ label: t("crumb.equipment") }, { label: t("equipment.crumb.map") }]}
      />
      <FilterBar onClear={() => setCategory("")} canClear={category !== ""}>
        <FilterSelect
          label={t("field.category")}
          value={category}
          onChange={setCategory}
          options={categories}
        />
      </FilterBar>
      <KpiGroup columns="grid-cols-2 md:grid-cols-5" ariaLabel={t("equipment.map.title")}>
        <KpiCard
          variant="tile"
          label={t("equipment.col.owned")}
          value={formatQty(sum(totals, (r) => r.ownedQty))}
          loading={isLoading}
        />
        <KpiCard
          variant="tile"
          label={t("equipment.col.onRent")}
          value={formatQty(sum(totals, (r) => r.rentedQty))}
          loading={isLoading}
        />
        <KpiCard
          variant="tile"
          label={t("equipment.col.atSites")}
          value={formatQty(sum(totals, (r) => r.atSitesQty))}
          loading={isLoading}
        />
        <KpiCard
          variant="tile"
          label={t("equipment.common.yard")}
          value={formatQty(sum(totals, (r) => r.atYardQty))}
          loading={isLoading}
        />
        <KpiCard
          variant="tile"
          label={t("equipment.common.inTransit")}
          value={formatQty(sum(totals, (r) => r.inTransitQty))}
          loading={isLoading}
        />
      </KpiGroup>
      {isLoading ? (
        <CardsSkeleton count={3} height="h-40" />
      ) : !locations.length ? (
        <SectionCard>
          <EmptyState
            icon={Forklift}
            title={t("equipment.map.emptyTitle")}
            description={t("equipment.map.emptyDesc")}
          />
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((entry) => (
            <LocationCard key={entry.location.id} entry={entry} />
          ))}
        </div>
      )}
      <SectionCard title={t("equipment.map.totalsTitle")} flush>
        <DataTable
          rows={totals}
          columns={columns}
          getRowId={(r) => r.equipment.id}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          clientPageSize={0}
          empty={{ title: t("equipment.map.emptyTitle") }}
        />
      </SectionCard>
    </>
  );
}
