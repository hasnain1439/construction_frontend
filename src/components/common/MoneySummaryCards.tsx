"use client";

import { Banknote, Clock, FileText, HandCoins, Landmark, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import type { ProjectReceivables } from "@/api/types";
import { useT } from "@/i18n/useT";
import { formatPKRShort, toPaisaBigInt } from "@/lib/money";
import { KpiCard } from "./KpiCard";

/** Contract / invoiced / received / pending / outstanding / own money invested for a project. */
export function MoneySummaryCards({ data, loading }: { data: ProjectReceivables | undefined; loading?: boolean }) {
  const t = useT();
  const own = toPaisaBigInt(data?.ownMoneyInvestedPaisa) ?? BigInt(0);
  const surplus = own < BigInt(0);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={t("app.components.money.summary")}>
      <KpiCard variant="tile" highlight label={t("app.components.money.contractRevised")} icon={Landmark} loading={loading} value={formatPKRShort(data?.revisedContractPaisa ?? "0")} hint={data && data.approvedChangesPaisa !== "0" ? t("app.components.money.changes", { amount: formatPKRShort(data.approvedChangesPaisa) }) : t("app.components.money.noChangeOrders")} />
      <KpiCard variant="tile" label={t("field.invoiced")} icon={FileText} loading={loading} value={formatPKRShort(data?.invoicedPaisa ?? "0")} hint={data ? t(data.readyStagesCount === 1 ? "app.components.money.oneStageReady" : "app.components.money.nStagesReady", { n: data.readyStagesCount }) : undefined} />
      <KpiCard variant="tile" label={t("field.received")} icon={Banknote} tone="success" loading={loading} value={formatPKRShort(data?.receivedPaisa ?? "0")} hint={data ? t("app.components.money.ofInvoiced", { n: data.collectedPercent }) : undefined} />
      <KpiCard variant="tile" label={t("app.components.money.pendingCheques")} icon={Clock} tone="warning" loading={loading} value={formatPKRShort(data?.pendingChequesPaisa ?? "0")} />
      <KpiCard
        variant="tile"
        label={t("field.outstanding")}
        icon={data && data.overduePaisa !== "0" ? TriangleAlert : HandCoins}
        tone={data && data.overduePaisa !== "0" ? "danger" : "primary"}
        loading={loading}
        value={formatPKRShort(data?.outstandingPaisa ?? "0")}
        hint={data && data.overduePaisa !== "0" ? t("app.components.money.overdueDays", { amount: formatPKRShort(data.overduePaisa), n: data.oldestOverdueDays }) : t("dashboard.nothingOverdue")}
      />
      <KpiCard
        variant="tile"
        label={surplus ? t("app.components.money.ownerAhead") : t("dashboard.ownMoneyInvested")}
        icon={surplus ? TrendingUp : TrendingDown}
        tone={surplus ? "success" : "warning"}
        loading={loading}
        value={formatPKRShort((surplus ? -own : own).toString())}
        hint={data ? t("app.components.money.spentMinusReceived", { spent: formatPKRShort(data.spentToDatePaisa), received: formatPKRShort(data.receivedPaisa) }) : undefined}
      />
    </div>
  );
}
