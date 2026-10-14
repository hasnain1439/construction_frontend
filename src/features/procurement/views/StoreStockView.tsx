"use client";

import { ClipboardCheck, Package, SlidersHorizontal, TriangleAlert, Truck, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetStockLocationsQuery, useGetStoreStockQuery } from "@/api/services/inventory.api";
import type { StoreStockRow } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StockStatusBadge } from "@/components/common/StockStatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { formatQty } from "@/lib/quantity";
import { NewDispatchSlideOver } from "../components/DispatchSlideOvers";
import { LowStockLevelsSlideOver, MovementHistorySlideOver, StockCountSlideOver } from "../components/StockSlideOvers";

export function StoreStockView() {
  const t = useT();
  const readOnly = useReadOnly();
  const owner = useCan("inventory.store.manage") && !readOnly;
  const locations = useGetStockLocationsQuery();
  const store = locations.data?.find((l) => l.type === "STORE");
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const { data, isLoading, isFetching, error, refetch } = useGetStoreStockQuery({ locationId: store?.id ?? "", ...(search ? { search } : {}), ...(lowOnly ? { lowStockOnly: "true" } : {}) }, { skip: !store });
  const [history, setHistory] = useState<StoreStockRow | null>(null);
  const [open, setOpen] = useState<"levels" | "dispatch" | "count" | null>(null);

  const available = useMemo(() => (data?.items ?? []).map((i) => ({ materialId: i.material.id, qty: i.inStore, unit: i.material.unit })), [data]);

  const columns: Column<StoreStockRow>[] = [
    {
      id: "material",
      header: t("field.material"),
      sortValue: (r) => r.material.name,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.material.name}</p>
          <p className="text-xs text-muted-foreground">{r.material.group.name}</p>
        </div>
      ),
    },
    {
      id: "inStore",
      header: t("procurement.storeStock.colInStore"),
      align: "right",
      sortValue: (r) => r.inStore,
      cell: (r) => (
        <div className="flex flex-col items-end gap-1">
          <span className="font-semibold tabular">{formatQty(r.inStore, r.material.unit)}</span>
          {r.lowStock || r.inStore <= 0 ? <StockStatusBadge qty={r.inStore} minQty={r.minQty} /> : null}
        </div>
      ),
    },
    { id: "transit", header: t("procurement.storeStock.colOnTheWay"), align: "right", cell: (r) => (r.inTransit ? formatQty(r.inTransit, r.material.unit) : "—") },
    { id: "avg", header: t("procurement.storeStock.colAvgRate"), align: "right", cell: (r) => <MoneyText paisa={r.avgRatePaisa} /> },
    { id: "value", header: t("field.value"), align: "right", sortValue: (r) => Number(r.valuePaisa ?? 0), cell: (r) => <MoneyText paisa={r.valuePaisa} /> },
    { id: "min", header: t("procurement.storeStock.colLowBelow"), align: "right", cell: (r) => (r.minQty !== null ? formatQty(r.minQty, r.material.unit) : "—") },
    { id: "last", header: t("procurement.storeStock.colLastPurchase"), cell: (r) => formatDate(r.lastPurchaseAt) },
  ];

  return (
    <>
      <PageHeader
        title={t("procurement.storeStock.title")}
        description={t("procurement.storeStock.desc")}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.storeStock") }]}
        actions={
          owner && store ? (
            <>
              <Button onClick={() => setOpen("dispatch")}>
                <Truck data-icon="inline-start" />
                {t("procurement.dispatch.newTitle")}
              </Button>
              <Button variant="outline" onClick={() => setOpen("count")}>
                <ClipboardCheck data-icon="inline-start" />
                {t("procurement.storeStock.stockCount")}
              </Button>
              <Button variant="outline" onClick={() => setOpen("levels")}>
                <SlidersHorizontal data-icon="inline-start" />
                {t("procurement.storeStock.setLevels")}
              </Button>
            </>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("procurement.storeStock.kpiValue")} icon={Wallet} loading={!data} value={data ? <span title={data.summary.totalValuePaisa}>{formatPKRShort(data.summary.totalValuePaisa)}</span> : null} hint={data ? t("procurement.storeStock.kpiValueHint", { n: data.summary.materials }) : undefined} />
        <KpiCard label={t("procurement.storeStock.kpiLow")} icon={TriangleAlert} tone={data?.summary.lowStockCount ? "warning" : "success"} loading={!data} value={data?.summary.lowStockCount ?? 0} hint={t("procurement.storeStock.kpiLowHint")} />
        <KpiCard label={t("procurement.storeStock.kpiOnWay")} icon={Truck} loading={!data} value={data?.summary.dispatchesOnTheWay ?? 0} hint={t("procurement.storeStock.kpiOnWayHint")} />
      </div>
      <FilterBar
        trailing={
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={lowOnly} onCheckedChange={setLowOnly} aria-label={t("procurement.storeStock.lowOnly")} />
            {t("procurement.storeStock.lowOnly")}
          </label>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder={t("procurement.storeStock.searchPlaceholder")} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(r) => r.material.id}
          loading={isLoading || isFetching || locations.isLoading}
          error={error ?? locations.error}
          onRetry={refetch}
          onRowClick={setHistory}
          clientPageSize={25}
          rowClassName={(r) => (r.lowStock ? "bg-warning-soft/40" : undefined)}
          empty={{ title: t(lowOnly ? "procurement.storeStock.nothingLow" : "procurement.storeStock.storeEmpty"), description: t("procurement.storeStock.emptyDesc"), icon: Package }}
        />
      </SectionCard>
      {store ? (
        <>
          <MovementHistorySlideOver open={Boolean(history)} onOpenChange={(o) => (!o ? setHistory(null) : undefined)} locationId={store.id} material={history?.material ?? null} currentQty={history?.inStore ?? 0} />
          <LowStockLevelsSlideOver
            open={open === "levels"}
            onOpenChange={(o) => setOpen(o ? "levels" : null)}
            locationId={store.id}
            current={(data?.items ?? []).filter((i) => i.minQty !== null).map((i) => ({ material: i.material, minQty: i.minQty }))}
          />
          <NewDispatchSlideOver open={open === "dispatch"} onOpenChange={(o) => setOpen(o ? "dispatch" : null)} fromOptions={[{ value: store.id, label: t("field.centralStore") }]} defaultFromId={store.id} available={available} />
          <StockCountSlideOver
            open={open === "count"}
            onOpenChange={(o) => setOpen(o ? "count" : null)}
            locationId={store.id}
            locationName={t("field.centralStore")}
            materials={(data?.items ?? []).filter((i) => i.inStore !== 0).map((i) => i.material)}
            system={new Map((data?.items ?? []).map((i) => [i.material.id, i.inStore]))}
          />
        </>
      ) : null}
    </>
  );
}
