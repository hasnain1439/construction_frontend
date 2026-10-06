import { Banknote, Clock, FileText, HandCoins, Landmark, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import type { ProjectReceivables } from "@/api/types";
import { formatPKRShort, toPaisaBigInt } from "@/lib/money";
import { KpiCard } from "./KpiCard";

/** Contract / invoiced / received / pending / outstanding / own money invested for a project. */
export function MoneySummaryCards({ data, loading }: { data: ProjectReceivables | undefined; loading?: boolean }) {
  const own = toPaisaBigInt(data?.ownMoneyInvestedPaisa) ?? BigInt(0);
  const surplus = own < BigInt(0);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Money summary">
      <KpiCard label="Contract (revised)" icon={Landmark} loading={loading} value={formatPKRShort(data?.revisedContractPaisa ?? "0")} hint={data && data.approvedChangesPaisa !== "0" ? `Changes ${formatPKRShort(data.approvedChangesPaisa)}` : "No change orders yet"} />
      <KpiCard label="Invoiced" icon={FileText} loading={loading} value={formatPKRShort(data?.invoicedPaisa ?? "0")} hint={data ? `${data.readyStagesCount} stage${data.readyStagesCount === 1 ? "" : "s"} ready to bill` : undefined} />
      <KpiCard label="Received" icon={Banknote} tone="success" loading={loading} value={formatPKRShort(data?.receivedPaisa ?? "0")} hint={data ? `${data.collectedPercent}% of invoiced` : undefined} />
      <KpiCard label="Pending cheques" icon={Clock} tone="warning" loading={loading} value={formatPKRShort(data?.pendingChequesPaisa ?? "0")} />
      <KpiCard
        label="Outstanding"
        icon={data && data.overduePaisa !== "0" ? TriangleAlert : HandCoins}
        tone={data && data.overduePaisa !== "0" ? "danger" : "primary"}
        loading={loading}
        value={formatPKRShort(data?.outstandingPaisa ?? "0")}
        hint={data && data.overduePaisa !== "0" ? `${formatPKRShort(data.overduePaisa)} overdue · ${data.oldestOverdueDays} days` : "Nothing overdue"}
      />
      <KpiCard
        label={surplus ? "Owner money ahead" : "Own money invested"}
        icon={surplus ? TrendingUp : TrendingDown}
        tone={surplus ? "success" : "warning"}
        loading={loading}
        value={formatPKRShort((surplus ? -own : own).toString())}
        hint={data ? `Spent ${formatPKRShort(data.spentToDatePaisa)} − received ${formatPKRShort(data.receivedPaisa)}` : undefined}
      />
    </div>
  );
}
