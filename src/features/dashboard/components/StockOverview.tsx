"use client";

import { ClipboardCheck, PackageSearch, TriangleAlert, Truck } from "lucide-react";
import Link from "next/link";
import { useGetShortagesQuery } from "@/api/services/dispatch.api";
import { useGetStockLocationsQuery, useGetStoreStockQuery } from "@/api/services/inventory.api";
import { useGetSuppliersQuery } from "@/api/services/masterData.api";
import type { SuppliersQuery } from "@/api/types";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StockStatusBadge } from "@/components/common/StockStatusBadge";
import { Button } from "@/components/ui/button";
import { formatPKRShort } from "@/lib/money";
import { formatQty } from "@/lib/quantity";

/**
 * Dashboard money + stock row (rates.view): store stock value, supplier udhaar, open
 * shortages and low stock, with an alerts list linking to the pages that fix them.
 */
export function StockOverview() {
  const locations = useGetStockLocationsQuery();
  const store = locations.data?.find((l) => l.type === "STORE");
  const stock = useGetStoreStockQuery({ locationId: store?.id ?? "" }, { skip: !store });
  const suppliers = useGetSuppliersQuery({ limit: 100 } as SuppliersQuery);
  const shortages = useGetShortagesQuery({ status: "OPEN", limit: 5 });

  const udhaar = (suppliers.data?.items ?? []).reduce((s, x) => s + BigInt(x.udhaarBalancePaisa ?? "0"), BigInt(0));
  const oldest = Math.max(-1, ...(suppliers.data?.items ?? []).map((s) => s.oldestUnpaidDays ?? -1));
  const low = (stock.data?.items ?? []).filter((i) => i.lowStock).slice(0, 5);
  const openShortages = shortages.data?.items ?? [];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Store stock value"
          icon={PackageSearch}
          loading={stock.isLoading || locations.isLoading}
          value={stock.data ? formatPKRShort(stock.data.summary.totalValuePaisa) : "—"}
          hint={stock.data ? `${stock.data.summary.dispatchesOnTheWay} dispatch${stock.data.summary.dispatchesOnTheWay === 1 ? "" : "es"} on the way` : undefined}
        />
        <KpiCard
          label="Supplier udhaar"
          icon={Truck}
          tone={udhaar > BigInt(0) ? "warning" : "success"}
          loading={suppliers.isLoading}
          value={formatPKRShort(udhaar.toString())}
          hint={oldest >= 0 ? `Oldest unpaid ${oldest} days` : "Nothing owed"}
        />
        <KpiCard
          label="Open shortages"
          icon={TriangleAlert}
          tone={shortages.data?.meta.openCount ? "danger" : "success"}
          loading={shortages.isLoading}
          value={shortages.data?.meta.openCount ?? 0}
          hint={shortages.data?.meta.openValuePaisa ? <>Worth <MoneyText paisa={shortages.data.meta.openValuePaisa} short /></> : undefined}
        />
        <KpiCard label="Low stock" icon={ClipboardCheck} tone={stock.data?.summary.lowStockCount ? "warning" : "success"} loading={stock.isLoading} value={stock.data?.summary.lowStockCount ?? 0} hint="Store materials below their level" />
      </div>
      {openShortages.length || low.length ? (
        <SectionCard
          title="Alerts"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/approvals">My approvals</Link>
            </Button>
          }
          flush
        >
          <ul className="divide-y text-sm">
            {openShortages.map((s) => (
              <li key={s.id}>
                <Link href="/suppliers-stock/shortages" className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <StatusBadge domain="shortageKind" value={s.kind} />
                    {formatQty(s.qty, s.material.unit)} {s.material.name} · {s.dispatch?.number ?? s.purchase?.number} · {s.project?.name ?? s.location.name}
                  </span>
                  <MoneyText paisa={s.valuePaisa} />
                </Link>
              </li>
            ))}
            {low.map((i) => (
              <li key={i.material.id}>
                <Link href="/suppliers-stock/store-stock" className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <StockStatusBadge qty={i.inStore} minQty={i.minQty} />
                    {i.material.name}: {formatQty(i.inStore, i.material.unit)} in store (level {formatQty(i.minQty, i.material.unit)})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </>
  );
}
