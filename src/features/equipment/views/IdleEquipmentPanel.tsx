"use client";

import { BellRing, Hourglass } from "lucide-react";
import Link from "next/link";
import { useGetEquipmentIdleQuery, useRunEquipmentIdleCheckMutation } from "@/api/services/equipment.api";
import type { IdleRental, IdleRentalsQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { useSeesRates } from "../options";

/**
 * Rented equipment idle at a site (no milestone work for the company's idle-days threshold): days idle
 * and the rent being paid for nothing (only with fields.rates). "Check now" sends the alert.
 */
export function IdleEquipmentPanel({ projectId }: { projectId?: string }) {
  const t = useT();
  const te = useEnumT();
  const rates = useSeesRates();
  const readOnly = useReadOnly();
  const canCheck = useCan("equipment.rental.manage") && !readOnly;
  const { data, isLoading, error, refetch } = useGetEquipmentIdleQuery((projectId ? { projectId } : undefined) as IdleRentalsQuery | undefined);
  const [check, { isLoading: checking }] = useRunEquipmentIdleCheckMutation();
  const run = useMutationToast();
  const threshold = data?.thresholdDays ?? 0;

  const columns: Column<IdleRental>[] = [
    {
      id: "rental",
      header: t("equipment.col.number"),
      cell: (r) => (
        <Link href={`/equipment/rentals/${r.rental.id}`} className="font-medium tabular hover:underline">
          {r.rental.number}
        </Link>
      ),
    },
    {
      id: "site",
      header: t("field.site"),
      cell: (r) => (
        <span className="min-w-0">
          <span className="block">{r.project.name}</span>
          <span className="block text-xs text-muted-foreground">{r.rental.supplier.name}</span>
        </span>
      ),
    },
    {
      id: "items",
      header: t("equipment.common.items"),
      cell: (r) => r.items.map((i) => `${formatQty(i.qty, i.equipment.unit)} ${i.equipment.name}`).join(", "),
    },
    {
      id: "idle",
      header: t("equipment.idle.colIdle"),
      align: "right",
      sortValue: (r) => r.idleDays,
      cell: (r) => (
        <span className="tabular">
          <span className="block font-semibold text-danger">{t("equipment.idle.days", { n: r.idleDays })}</span>
          <span className="block text-xs text-muted-foreground">{t("equipment.idle.since", { date: formatDate(r.since) })}</span>
        </span>
      ),
    },
    {
      id: "activity",
      header: t("equipment.idle.colActivity"),
      cell: (r) =>
        r.lastActivity ? (
          <span>
            <span className="block">{te("idleActivity", r.lastActivity.kind)}</span>
            <span className="block text-xs text-muted-foreground">{formatDate(r.lastActivity.date)}</span>
          </span>
        ) : (
          <StatusBadge tone="warning" label={r.hasSchedule ? t("equipment.idle.noActivity") : t("equipment.idle.noSchedule")} />
        ),
    },
    {
      id: "daily",
      header: t("equipment.idle.colDaily"),
      align: "right",
      hidden: !rates,
      cell: (r) => <MoneyText paisa={r.dailyCostPaisa} />,
    },
    {
      id: "wasted",
      header: t("equipment.idle.colWasted"),
      align: "right",
      hidden: !rates,
      cell: (r) => <MoneyText paisa={r.idleCostPaisa} />,
    },
  ];

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Hourglass className="size-4 text-warning" aria-hidden />
          {t("equipment.idle.title")}
        </span>
      }
      description={t("equipment.idle.desc", { days: threshold })}
      actions={
        <span className="flex flex-wrap items-center gap-2">
          {rates && data?.totalDailyCostPaisa && data.items.length ? (
            <span className="text-sm text-muted-foreground" data-testid="idle-total">
              {t("equipment.idle.totalDaily")} <MoneyText paisa={data.totalDailyCostPaisa} className="font-semibold text-danger" />
            </span>
          ) : null}
          {canCheck ? (
            <Button
              size="sm"
              variant="outline"
              disabled={checking}
              onClick={() =>
                void run(() => check().unwrap(), {
                  success: (r) => t("equipment.idle.checked", { idle: r.idle, sent: r.notified.length }),
                })
              }
            >
              <BellRing data-icon="inline-start" />
              {t("equipment.idle.check")}
            </Button>
          ) : null}
        </span>
      }
      flush
    >
      <DataTable
        rows={data?.items}
        columns={columns}
        getRowId={(r) => `${r.rental.id}:${r.location.id}`}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        clientPageSize={0}
        empty={{ title: t("equipment.idle.empty"), description: t("equipment.idle.emptyDesc", { days: threshold }), icon: Hourglass }}
      />
    </SectionCard>
  );
}
