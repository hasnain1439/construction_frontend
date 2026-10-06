"use client";

import { BadgeAlert, CircleAlert, Flag, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useGetBillingEventsQuery, useGetReceivablesQuery } from "@/api/services/billing.api";
import type { BillingEvent } from "@/api/types";
import { DataTable } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { RingKpiCard } from "@/components/common/RingKpiCard";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { formatPKR, formatPKRShort, toPaisaBigInt } from "@/lib/money";

const EVENT: Record<BillingEvent["type"], { label: string; icon: typeof Flag; tone: string; action: string }> = {
  INVOICE_OVERDUE: { label: "Invoice overdue", icon: TriangleAlert, tone: "text-danger", action: "Open invoice" },
  CHEQUE_BOUNCED: { label: "Cheque bounced", icon: BadgeAlert, tone: "text-danger", action: "Payments" },
  STAGE_READY_UNBILLED: { label: "Stage ready, not billed", icon: Flag, tone: "text-primary", action: "Create invoice" },
  PREVIOUS_STAGE_UNPAID: { label: "Earlier stage unpaid", icon: CircleAlert, tone: "text-warning", action: "Schedule" },
};

export function eventText(e: BillingEvent): string {
  const d = (e.details ?? {}) as Record<string, string | number | undefined>;
  switch (e.type) {
    case "INVOICE_OVERDUE":
      return `${d.number ?? "Invoice"} — ${formatPKR(String(d.balancePaisa ?? "0"))} due ${d.dueDate ? formatDate(String(d.dueDate)) : ""}`;
    case "CHEQUE_BOUNCED":
      return `${[d.bankName, "cheque", d.chequeNo].filter(Boolean).join(" ")} ${formatPKR(String(d.amountPaisa ?? "0"))} — ${d.reason ?? ""}`;
    case "STAGE_READY_UNBILLED":
      return `${d.label ?? "Stage"} · ${formatPKR(String(d.amountPaisa ?? "0"))}`;
    default:
      return "An earlier stage is unpaid past its due date";
  }
}

/** Owner dashboard: receivables KPIs and billing alerts. */
export function BillingOverview() {
  const r = useGetReceivablesQuery();
  const events = useGetBillingEventsQuery({ openOnly: "true" });
  const t = r.data?.totals;
  const invoiced = Number(toPaisaBigInt(t?.invoicedPaisa) ?? BigInt(0));
  const received = Number(toPaisaBigInt(t?.receivedPaisa) ?? BigInt(0));
  return (
    <section className="space-y-3" aria-label="Receivables">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RingKpiCard
          label="Receivables outstanding"
          value={formatPKRShort(t?.outstandingPaisa ?? "0")}
          percent={invoiced ? (received / invoiced) * 100 : 0}
          ringLabel="collected"
          hint={t ? `${formatPKRShort(t.receivedPaisa)} of ${formatPKRShort(t.invoicedPaisa)} collected` : undefined}
          loading={r.isLoading}
          tone="success"
        />
        <KpiCard
          label="Overdue"
          icon={TriangleAlert}
          tone={t && t.overduePaisa !== "0" ? "danger" : "success"}
          value={formatPKRShort(t?.overduePaisa ?? "0")}
          hint={t ? `${t.overdueProjects} project${t.overdueProjects === 1 ? "" : "s"}` : undefined}
          loading={r.isLoading}
        />
      </div>
      <SectionCard
        flush
        title={`Alerts${events.data?.length ? ` (${events.data.length})` : ""}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/finance/receivables">Receivables</Link>
          </Button>
        }
      >
        <DataTable
          rows={events.data}
          getRowId={(e) => e.id}
          loading={events.isLoading}
          error={events.error}
          onRetry={events.refetch}
          clientPageSize={8}
          empty={{ title: "No billing alerts", compact: true }}
          columns={[
            {
              id: "type",
              header: "Alert",
              cell: (e) => {
                const m = EVENT[e.type];
                const Icon = m.icon;
                return (
                  <span className={`inline-flex items-center gap-2 font-medium ${m.tone}`}>
                    <Icon className="size-4" aria-hidden />
                    {m.label}
                  </span>
                );
              },
            },
            { id: "project", header: "Project", cell: (e) => e.project.name },
            { id: "detail", header: "Detail", cell: (e) => <span className="text-sm text-muted-foreground">{eventText(e)}</span> },
            { id: "when", header: "Since", cell: (e) => formatDate(e.occurredAt) },
            {
              id: "action",
              header: "",
              align: "right",
              cell: (e) => (
                <Button asChild size="sm" variant="outline">
                  <Link href={e.href}>{EVENT[e.type].action}</Link>
                </Button>
              ),
            },
          ]}
        />
      </SectionCard>
    </section>
  );
}

/** My Approvals: stages marked ready that still have no invoice. */
export function ReadyStagesApprovals() {
  const events = useGetBillingEventsQuery({ openOnly: "true" });
  const ready = (events.data ?? []).filter((e) => e.type === "STAGE_READY_UNBILLED");
  return (
    <SectionCard
      flush
      title={
        <span className="flex items-center gap-2">
          <Flag className="size-4 text-primary" aria-hidden />
          Stages ready to bill
        </span>
      }
    >
      <DataTable
        rows={ready}
        getRowId={(e) => e.id}
        loading={events.isLoading}
        empty={{ title: "No stages waiting for an invoice", compact: true }}
        columns={[
          { id: "project", header: "Project", cell: (e) => <span className="font-medium">{e.project.name}</span> },
          { id: "stage", header: "Stage", cell: (e) => eventText(e) },
          { id: "since", header: "Ready since", cell: (e) => formatDate(e.occurredAt) },
          {
            id: "action",
            header: "",
            align: "right",
            cell: (e) => (
              <Button asChild size="sm">
                <Link href={e.href}>Create invoice</Link>
              </Button>
            ),
          },
        ]}
      />
    </SectionCard>
  );
}
