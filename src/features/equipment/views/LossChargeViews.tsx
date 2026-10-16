"use client";

import { Calculator, ClipboardList, Gavel, ReceiptText, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useGetEquipmentChargesQuery,
  useGetEquipmentLossesQuery,
  useRunEquipmentAccrualMutation,
} from "@/api/services/equipment.api";
import type {
  EquipmentCharge,
  EquipmentChargesQuery,
  EquipmentLoss,
  EquipmentLossesQuery,
} from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useSiteProjectOptions } from "@/features/procurement/options";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDate, formatMonth, todayPK } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { ChargeLossSlideOver, ReportLossSlideOver } from "../components/LossSlideOvers";
import { placeName, useSeesRates } from "../options";

const LOSS_STATUSES = ["REPORTED", "CHARGED"] as const;
const LOSS_KINDS = ["MISSING", "DAMAGED"] as const;
const CHARGE_KINDS = ["INTERNAL_HIRE", "RENTAL"] as const;

/** Loss table columns; `onCharge` adds the "Charge" action for REPORTED rows. */
export function useLossColumns(onCharge?: (loss: EquipmentLoss) => void): Column<EquipmentLoss>[] {
  const t = useT();
  const te = useEnumT();
  const rates = useSeesRates();
  return [
    {
      id: "number",
      header: t("equipment.col.number"),
      cell: (l) => <span className="tabular font-medium">{l.number}</span>,
    },
    {
      id: "date",
      header: t("field.date"),
      cell: (l) => formatDate(l.reportedAt),
      sortValue: (l) => l.reportedAt,
    },
    {
      id: "kind",
      header: t("field.type"),
      cell: (l) => <StatusBadge domain="equipmentLossKind" value={l.kind} />,
    },
    {
      id: "what",
      header: t("equipment.field.equipment"),
      cell: (l) => (
        <div>
          <p className="font-medium">
            {formatQty(l.qty, l.equipment.unit)} {l.equipment.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {[
              l.rental?.number,
              l.transfer
                ? t("equipment.loss.fromTransfer", { number: l.transfer.number })
                : te("equipmentLossSource", l.source),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ),
    },
    {
      id: "where",
      header: t("equipment.field.location"),
      cell: (l) => (l.project ? l.project.name : placeName(t, l.location)),
    },
    {
      id: "note",
      header: t("field.note"),
      cell: (l) => <span className="text-sm text-muted-foreground">{l.note ?? ""}</span>,
    },
    {
      id: "photo",
      header: t("field.photo"),
      cell: (l) =>
        l.photoUrl ? (
          <a
            href={l.photoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
            onClick={(e) => e.stopPropagation()}
          >
            {t("equipment.common.openPhoto")}
          </a>
        ) : null,
    },
    {
      id: "value",
      header: t("field.value"),
      align: "right",
      hidden: !rates,
      cell: (l) => <MoneyText paisa={l.valuePaisa} />,
    },
    {
      id: "status",
      header: t("field.status"),
      cell: (l) => (
        <div className="space-y-1">
          <StatusBadge domain="equipmentLoss" value={l.status} />
          {l.chargedTo ? (
            <p className="text-xs text-muted-foreground">
              {[te("equipmentChargedTo", l.chargedTo), l.subcontract?.name].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "action",
      header: <span className="sr-only">{t("common.actions")}</span>,
      align: "right",
      hidden: !onCharge,
      cell: (l) =>
        l.status === "REPORTED" && onCharge ? (
          <Button size="sm" variant="outline" onClick={() => onCharge(l)}>
            <Gavel data-icon="inline-start" />
            {t("equipment.loss.charge")}
          </Button>
        ) : null,
    },
  ];
}

export function LossDamageView() {
  const t = useT();
  const ts = useStatusT();
  const readOnly = useReadOnly();
  const canReport = useCan("equipment.loss.create") && !readOnly;
  const canCharge = useCan("equipment.loss.approve") && !readOnly;
  const projects = useSiteProjectOptions();
  const list = useListState({ status: "", kind: "", projectId: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetEquipmentLossesQuery(
    list.query as EquipmentLossesQuery,
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [charging, setCharging] = useState<EquipmentLoss | null>(null);
  const columns = useLossColumns(canCharge ? setCharging : undefined);
  return (
    <>
      <PageHeader
        title={t("equipment.loss.title")}
        description={t("equipment.loss.desc")}
        breadcrumbs={[{ label: t("crumb.equipment") }, { label: t("equipment.crumb.loss") }]}
        actions={
          canReport ? (
            <Button onClick={() => setReportOpen(true)}>
              <TriangleAlert data-icon="inline-start" />
              {t("equipment.loss.report")}
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={LOSS_STATUSES.map((value) => ({ value, label: ts("equipmentLoss", value) }))}
        />
        <FilterSelect
          label={t("field.type")}
          value={list.filters.kind}
          onChange={(v) => list.setFilter("kind", v)}
          options={LOSS_KINDS.map((value) => ({ value, label: ts("equipmentLossKind", value) }))}
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
          getRowId={(l) => l.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{
            title: t("equipment.loss.emptyTitle"),
            description: t("equipment.loss.emptyDesc"),
            icon: ClipboardList,
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
      <ReportLossSlideOver open={reportOpen} onOpenChange={setReportOpen} />
      <ChargeLossSlideOver
        loss={charging}
        open={Boolean(charging)}
        onOpenChange={(o) => !o && setCharging(null)}
      />
    </>
  );
}

/** Last 12 months as "YYYY-MM" (current first). */
function recentMonths(today = todayPK()): string[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const monthRange = (month: string) => {
  if (!month) return {};
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
};

/** Daily internal hire + rent rows (one per equipment per day). Amounts need `fields.rates`. */
export function ChargesView() {
  const t = useT();
  const te = useEnumT();
  const rates = useSeesRates();
  const readOnly = useReadOnly();
  const canRun = useCan("equipment.manage") && !readOnly;
  const projects = useSiteProjectOptions();
  const months = useMemo(() => recentMonths(), []);
  const list = useListState({ projectId: "", kind: "", month: months[0] ?? "" }, 50);
  const { month, ...filters } = list.filters;
  const query = { page: list.page, limit: list.pageSize, ...filters, ...monthRange(month) };
  const { data, isLoading, isFetching, error, refetch } = useGetEquipmentChargesQuery(
    query as EquipmentChargesQuery,
  );
  const [runAccrual, accrual] = useRunEquipmentAccrualMutation();
  const run = useMutationToast();

  const columns: Column<EquipmentCharge>[] = [
    { id: "date", header: t("field.date"), cell: (c) => formatDate(c.date), sortValue: (c) => c.date },
    {
      id: "kind",
      header: t("field.type"),
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-1">
          {te("equipmentChargeKind", c.kind)}
          {c.correction ? <StatusBadge tone="neutral" label={t("equipment.charges.correction")} /> : null}
        </span>
      ),
    },
    {
      id: "project",
      header: t("field.project"),
      cell: (c) => (c.project ? c.project.name : placeName(t, c.location)),
    },
    {
      id: "equipment",
      header: t("equipment.field.equipment"),
      cell: (c) => <span className="font-medium">{c.equipment.name}</span>,
    },
    { id: "rental", header: t("equipment.col.rental"), cell: (c) => c.rental?.number ?? "—" },
    {
      id: "qty",
      header: t("field.quantity"),
      align: "right",
      cell: (c) => formatQty(c.qty, c.equipment.unit),
    },
    {
      id: "rate",
      header: t("equipment.field.ratePerDay"),
      align: "right",
      hidden: !rates,
      cell: (c) => <MoneyText paisa={c.ratePaisa} />,
    },
    {
      id: "amount",
      header: t("field.amount"),
      align: "right",
      hidden: !rates,
      cell: (c) => <MoneyText paisa={c.amountPaisa} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("equipment.charges.title")}
        description={t("equipment.charges.desc")}
        breadcrumbs={[{ label: t("crumb.equipment") }, { label: t("equipment.crumb.charges") }]}
        actions={
          canRun ? (
            <Button
              variant="outline"
              disabled={accrual.isLoading}
              onClick={() =>
                void run(() => runAccrual().unwrap(), {
                  success: (r) =>
                    t("equipment.charges.accrualDone", {
                      through: formatDate(r.through),
                      n: r.internalHire.rows + r.rental.rows,
                    }),
                })
              }
            >
              <Calculator data-icon="inline-start" />
              {t("equipment.charges.runAccrual")}
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label={t("equipment.charges.month")}
          value={month}
          onChange={(v) => list.setFilter("month", v)}
          options={months.map((value) => ({ value, label: formatMonth(value) }))}
        />
        <FilterSelect
          label={t("field.project")}
          value={list.filters.projectId}
          onChange={(v) => list.setFilter("projectId", v)}
          options={projects.options.map((o) => ({ value: o.value, label: o.label }))}
        />
        <FilterSelect
          label={t("field.type")}
          value={list.filters.kind}
          onChange={(v) => list.setFilter("kind", v)}
          options={CHARGE_KINDS.map((value) => ({ value, label: te("equipmentChargeKind", value) }))}
        />
      </FilterBar>
      {rates ? (
        <KpiGroup columns="md:grid-cols-2" ariaLabel={t("equipment.charges.title")}>
          <KpiCard
            variant="tile"
            icon={ReceiptText}
            label={t("equipment.charges.total")}
            value={<MoneyText paisa={data?.meta.totalPaisa ?? null} />}
            loading={isLoading}
          />
          <KpiCard
            variant="tile"
            label={t("equipment.charges.rows")}
            value={String(data?.meta.total ?? 0)}
            loading={isLoading}
          />
        </KpiGroup>
      ) : null}
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(c) => c.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{
            title: t("equipment.charges.emptyTitle"),
            description: t("equipment.charges.emptyDesc"),
            icon: ReceiptText,
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
