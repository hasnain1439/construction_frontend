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
import { useEnumT, useT, type TranslationKey, type TranslationVars } from "@/i18n/useT";
import { ChangePlanDialog } from "../components/ChangePlanDialog";
import { PlanCard } from "../components/PlanCard";
import { UploadSlipSlideOver } from "../components/UploadSlipSlideOver";

function renewalText(s: SubscriptionDetail, t: (key: TranslationKey, vars?: TranslationVars) => string) {
  const one = s.daysLeft === 1;
  switch (s.status) {
    case "TRIAL":
      return t(one ? "teamCompany.subscription.trialEndsOne" : "teamCompany.subscription.trialEnds", { date: formatDate(s.trialEndsAt), n: s.daysLeft });
    case "ACTIVE":
      return t(one ? "teamCompany.subscription.renewsOne" : "teamCompany.subscription.renews", { date: formatDate(s.currentPeriodEnd), n: s.daysLeft });
    case "GRACE":
      return t(one ? "teamCompany.subscription.graceOne" : "teamCompany.subscription.grace", { date: formatDate(s.graceEndsAt), n: s.daysLeft });
    case "LAPSED":
      return t("teamCompany.subscription.lapsed");
    default:
      return t("teamCompany.subscription.cancelled");
  }
}

function PaymentHistory() {
  const t = useT();
  const te = useEnumT();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useGetPaymentsQuery({ page, limit: 10 });
  const columns: Column<SubscriptionPayment>[] = [
    { id: "submitted", header: t("teamCompany.subscription.colSubmitted"), cell: (p) => formatDate(p.createdAt), sortValue: (p) => p.createdAt },
    { id: "plan", header: t("teamCompany.slip.plan"), cell: (p) => p.plan.name },
    { id: "amount", header: t("field.amount"), align: "right", cell: (p) => <MoneyText paisa={p.amountPaisa} /> },
    { id: "method", header: t("field.method"), cell: (p) => te("walletMethod", p.method) },
    { id: "txn", header: t("teamCompany.slip.transactionId"), cell: (p) => <span className="font-mono text-xs">{p.transactionId}</span> },
    {
      id: "status",
      header: t("field.status"),
      cell: (p) => (
        <div className="space-y-1">
          <StatusBadge domain="payment" value={p.status} />
          {p.rejectReason ? <p className="max-w-56 text-xs text-danger">{p.rejectReason}</p> : null}
        </div>
      ),
    },
    {
      id: "period",
      header: t("teamCompany.subscription.colPeriod"),
      cell: (p) => (p.periodStart ? t("teamCompany.holidays.range", { from: formatDate(p.periodStart), to: formatDate(p.periodEnd) }) : <span className="text-muted-foreground">—</span>),
    },
    { id: "receipt", header: t("teamCompany.subscription.colReceipt"), cell: (p) => p.receiptNo ?? <span className="text-muted-foreground">—</span> },
  ];
  return (
    <SectionCard title={t("teamCompany.subscription.history")} flush>
      <DataTable
        rows={data?.items}
        columns={columns}
        getRowId={(p) => p.id}
        loading={isLoading || isFetching}
        error={error}
        onRetry={refetch}
        empty={{ title: t("teamCompany.subscription.noPayments"), icon: Receipt }}
        pagination={data ? { page, pageSize: 10, total: data.meta.total, onPageChange: setPage } : undefined}
      />
    </SectionCard>
  );
}

function SubscriptionBody({ subscription }: { subscription: SubscriptionDetail }) {
  const t = useT();
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
        <InlineAlert tone="warning" title={t("teamCompany.subscription.graceTitle")}>
          {t("teamCompany.subscription.graceBody", { date: formatDate(subscription.graceEndsAt) })}
        </InlineAlert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title={t("teamCompany.plan.current")}
          actions={
            <Button onClick={() => setSlipFor(defaultSlipPlan)}>
              <Upload data-icon="inline-start" />
              {t("teamCompany.slip.title")}
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
              <span className="text-muted-foreground"> {t("teamCompany.plan.perMonth")}</span>
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden />
              {renewalText(subscription, t)}
            </p>
            {pending ? (
              <InlineAlert
                tone="info"
                title={t("teamCompany.subscription.changingTo", { name: pending.plan.name })}
                action={
                  <Button size="sm" variant="outline" onClick={() => setConfirmCancel(true)}>
                    {t("teamCompany.subscription.cancelChange")}
                  </Button>
                }
              >
                {pending.effectiveOn
                  ? t("teamCompany.subscription.takesEffect", { date: formatDate(pending.effectiveOn) })
                  : t("teamCompany.subscription.takesEffectPayment", { amount: formatPKR(pending.plan.pricePaisa) })}
              </InlineAlert>
            ) : null}
          </div>
        </SectionCard>
        <SectionCard title={t("teamCompany.subscription.usage")}>
          <div className="space-y-5">
            <UsageBar label={t("dashboard.activeProjects")} used={subscription.usage.activeProjects.used} limit={subscription.usage.activeProjects.limit} hint={t("teamCompany.subscription.projectsHint")} />
            <UsageBar label={t("teamCompany.members.officeUsers")} used={subscription.usage.officeUsers.used} limit={subscription.usage.officeUsers.limit} hint={t("teamCompany.subscription.usersHint")} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title={t("teamCompany.subscription.plans")} description={t("teamCompany.subscription.plansDesc")}>
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
                      {pending?.plan.id === plan.id ? t("teamCompany.subscription.changePending") : t("teamCompany.changePlan.switchTo", { name: plan.name })}
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
        title={t("teamCompany.subscription.cancelTitle")}
        description={t("teamCompany.subscription.cancelBody", { name: subscription.plan.name })}
        confirmLabel={t("teamCompany.subscription.cancelChange")}
        loading={cancelling}
        onConfirm={async () => {
          const ok = await run(() => cancelChange().unwrap(), { success: t("teamCompany.subscription.changeCancelled") });
          if (ok) setConfirmCancel(false);
        }}
      />
    </>
  );
}

export function SubscriptionView() {
  const t = useT();
  const query = useGetSubscriptionQuery();
  return (
    <>
      <PageHeader
        title={t("teamCompany.subscription.title")}
        description={t("teamCompany.subscription.desc")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("teamCompany.subscription.title") }]}
      />
      <QueryState query={query}>{(subscription) => <SubscriptionBody subscription={subscription} />}</QueryState>
    </>
  );
}
