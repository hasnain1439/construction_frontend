"use client";

import { CalendarClock, Receipt, Upload } from "lucide-react";
import { useState } from "react";
import {
  useCancelPlanChangeMutation,
  useGetPaymentsQuery,
  useGetPlansQuery,
  useGetSubscriptionQuery,
} from "@/api/services/subscription.api";
import type { PlanOption, SubscriptionDetail, SubscriptionPayment } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { UsageBar } from "@/components/common/UsageBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { PAYMENT_METHOD_LABEL } from "@/lib/options";
import { ChangePlanDialog } from "../components/ChangePlanDialog";
import { PlanCard } from "../components/PlanCard";
import { UploadSlipSlideOver } from "../components/UploadSlipSlideOver";

function renewalText(s: SubscriptionDetail) {
  switch (s.status) {
    case "TRIAL":
      return `Trial ends ${formatDate(s.trialEndsAt)} · ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left`;
    case "ACTIVE":
      return `Renews ${formatDate(s.currentPeriodEnd)} · ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left`;
    case "GRACE":
      return `Period ended — renew by ${formatDate(s.graceEndsAt)} (${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left)`;
    case "LAPSED":
      return "Expired — records are read-only until a payment is approved";
    default:
      return "Cancelled";
  }
}

function PaymentHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useGetPaymentsQuery({ page, limit: 10 });
  const columns: Column<SubscriptionPayment>[] = [
    { id: "submitted", header: "Submitted", cell: (p) => formatDate(p.createdAt), sortValue: (p) => p.createdAt },
    { id: "plan", header: "Plan", cell: (p) => p.plan.name },
    { id: "amount", header: "Amount", align: "right", cell: (p) => <MoneyText paisa={p.amountPaisa} /> },
    { id: "method", header: "Method", cell: (p) => PAYMENT_METHOD_LABEL[p.method] ?? p.method },
    { id: "txn", header: "Transaction ID", cell: (p) => <span className="font-mono text-xs">{p.transactionId}</span> },
    {
      id: "status",
      header: "Status",
      cell: (p) => (
        <div className="space-y-1">
          <StatusBadge domain="payment" value={p.status} />
          {p.rejectReason ? <p className="max-w-56 text-xs text-danger">{p.rejectReason}</p> : null}
        </div>
      ),
    },
    {
      id: "period",
      header: "Period",
      cell: (p) => (p.periodStart ? `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}` : <span className="text-muted-foreground">—</span>),
    },
    { id: "receipt", header: "Receipt", cell: (p) => p.receiptNo ?? <span className="text-muted-foreground">—</span> },
  ];
  return (
    <SectionCard title="Payment history" flush>
      <DataTable
        rows={data?.items}
        columns={columns}
        getRowId={(p) => p.id}
        loading={isLoading || isFetching}
        error={error}
        onRetry={refetch}
        empty={{ title: "No payments yet", icon: Receipt }}
        pagination={data ? { page, pageSize: 10, total: data.meta.total, onPageChange: setPage } : undefined}
      />
    </SectionCard>
  );
}

function SubscriptionBody({ subscription }: { subscription: SubscriptionDetail }) {
  const plans = useGetPlansQuery();
  const [slipFor, setSlipFor] = useState<string | null>(null);
  const [target, setTarget] = useState<PlanOption | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelChange, { isLoading: cancelling }] = useCancelPlanChangeMutation();
  const run = useMutationToast();
  const pending = subscription.pendingChange;
  const defaultSlipPlan = pending?.plan.id ?? subscription.plan.id;
  // A paid plan the company can pay for (the TRIAL plan isn't purchasable).
  const payablePlans = plans.data ?? [];

  return (
    <>
      {subscription.status === "GRACE" ? (
        <InlineAlert tone="warning" title="Renew within the grace period">
          Your paid period has ended. Upload a payment slip by {formatDate(subscription.graceEndsAt)} to avoid read-only mode.
        </InlineAlert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Current plan"
          actions={
            <Button onClick={() => setSlipFor(defaultSlipPlan)}>
              <Upload data-icon="inline-start" />
              Upload payment slip
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-2xl font-semibold">{subscription.plan.name}</p>
              <StatusBadge domain="subscription" value={subscription.status} />
            </div>
            <p className="text-sm">
              <span className="text-kpi font-semibold text-primary tabular">{formatPKR(subscription.plan.pricePaisa)}</span>
              <span className="text-muted-foreground"> / month</span>
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden />
              {renewalText(subscription)}
            </p>
            {pending ? (
              <InlineAlert
                tone="info"
                title={`Changing to ${pending.plan.name}`}
                action={
                  <Button size="sm" variant="outline" onClick={() => setConfirmCancel(true)}>
                    Cancel change
                  </Button>
                }
              >
                {pending.effectiveOn
                  ? `Takes effect ${formatDate(pending.effectiveOn)}.`
                  : `Takes effect when your payment of ${formatPKR(pending.plan.pricePaisa)} is approved.`}
              </InlineAlert>
            ) : null}
          </div>
        </SectionCard>
        <SectionCard title="Usage">
          <div className="space-y-5">
            <UsageBar label="Active projects" used={subscription.usage.activeProjects.used} limit={subscription.usage.activeProjects.limit} hint="Active and closeout projects count. Drafts are free." />
            <UsageBar label="Office users" used={subscription.usage.officeUsers.used} limit={subscription.usage.officeUsers.limit} hint="Thekedar and PMs (and pending PM invites). Munshis are free." />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Plans" description="Prices are per month. Pay by JazzCash, Easypaisa, Raast or bank transfer.">
        {plans.isLoading ? (
          <CardsSkeleton count={3} height="h-72" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {payablePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={plan.current}
                action={
                  plan.current ? null : (
                    <Button
                      className="w-full"
                      variant={pending?.plan.id === plan.id ? "secondary" : "outline"}
                      disabled={pending?.plan.id === plan.id}
                      onClick={() => setTarget(plan)}
                    >
                      {pending?.plan.id === plan.id ? "Change pending" : `Switch to ${plan.name}`}
                    </Button>
                  )
                }
              />
            ))}
          </div>
        )}
      </SectionCard>

      <PaymentHistory />

      <UploadSlipSlideOver
        open={slipFor !== null}
        onOpenChange={(o) => !o && setSlipFor(null)}
        plans={payablePlans}
        defaultPlanId={slipFor ?? defaultSlipPlan}
      />
      <ChangePlanDialog
        target={target}
        subscription={subscription}
        onClose={() => setTarget(null)}
        onUpgradeNeedsPayment={(planId) => setSlipFor(planId)}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        tone="default"
        title="Cancel the pending plan change?"
        description={`You stay on ${subscription.plan.name}.`}
        confirmLabel="Cancel change"
        loading={cancelling}
        onConfirm={async () => {
          const ok = await run(() => cancelChange().unwrap(), { success: "Plan change cancelled" });
          if (ok) setConfirmCancel(false);
        }}
      />
    </>
  );
}

export function SubscriptionView() {
  const query = useGetSubscriptionQuery();
  return (
    <>
      <PageHeader
        title="Subscription"
        description="Your plan, usage and payments."
        breadcrumbs={[{ label: "Settings" }, { label: "Subscription" }]}
      />
      <QueryState query={query}>{(subscription) => <SubscriptionBody subscription={subscription} />}</QueryState>
    </>
  );
}
