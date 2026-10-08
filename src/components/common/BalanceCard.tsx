import { Clock, Hourglass, TriangleAlert, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";
import { toPaisaBigInt } from "@/lib/money";
import { MoneyText } from "./MoneyText";

export interface BalanceCardAccount {
  holder: { name: string; role?: string };
  balancePaisa: string;
  pendingAckPaisa?: string;
  pendingApprovalPaisa?: string;
  recoverablePaisa?: string;
  lastCountAt?: string | null;
}

/** Cash in hand, big, with what is waiting (float to acknowledge, kharcha to approve, owed back). */
export function BalanceCard({
  account,
  loading,
  actions,
  className,
  title = "Cash in hand",
}: {
  account: BalanceCardAccount | undefined;
  loading?: boolean;
  actions?: ReactNode;
  className?: string;
  title?: string;
}) {
  const positive = (v?: string) => (toPaisaBigInt(v) ?? BigInt(0)) > BigInt(0);
  const low = account ? (toPaisaBigInt(account.balancePaisa) ?? BigInt(0)) < BigInt(0) : false;
  return (
    <section className={cn("flex flex-col gap-4 rounded-3xl border border-transparent bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between", className)} aria-label={title}>
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sun text-charcoal">
          <Wallet className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">
            {title}
            {account ? <span className="text-foreground"> · {account.holder.name}</span> : null}
          </p>
          {loading || !account ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            // Not cn(): tailwind-merge would treat text-kpi (a size) and the colour as one group.
            <p className={`text-kpi font-semibold tabular ${low ? "text-danger" : "text-foreground"}`} data-testid="cash-balance">
              <MoneyText paisa={account.balancePaisa} />
            </p>
          )}
          {account ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {positive(account.pendingAckPaisa) ? (
                <li className="inline-flex items-center gap-1 text-primary">
                  <Clock className="size-3.5" aria-hidden /> <MoneyText paisa={account.pendingAckPaisa} /> float to acknowledge
                </li>
              ) : null}
              {positive(account.pendingApprovalPaisa) ? (
                <li className="inline-flex items-center gap-1 text-warning">
                  <Hourglass className="size-3.5" aria-hidden /> <MoneyText paisa={account.pendingApprovalPaisa} /> waiting for approval
                </li>
              ) : null}
              {positive(account.recoverablePaisa) ? (
                <li className="inline-flex items-center gap-1 text-danger">
                  <TriangleAlert className="size-3.5" aria-hidden /> <MoneyText paisa={account.recoverablePaisa} /> to pay back
                </li>
              ) : null}
              <li>Last count: {account.lastCountAt ? formatDateTime(account.lastCountAt) : "never"}</li>
            </ul>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}
