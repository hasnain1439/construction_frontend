"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing, CalendarClock, HandCoins, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useGetRetentionQuery, useUpdateRetentionSettingsMutation } from "@/api/services/closeout.api";
import type { Retention, RetentionSubcontractor } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Form } from "@/components/forms/Form";
import { NumberField } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import { reminderSchema, type ReminderValues } from "./schemas";

/** Project → Documents & Closeout → Retention: due dates after handover, held amounts (gated), reminders. */
export function RetentionView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <ProjectPageShell projectId={projectId} crumb={t("closeout.retention.crumb")}>
      {() => <RetentionBody projectId={projectId} />}
    </ProjectPageShell>
  );
}

export function RetentionBody({ projectId }: { projectId: string }) {
  const t = useT();
  const q = useGetRetentionQuery(projectId);
  if (q.isLoading) return <CardsSkeleton count={3} height="h-32" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const r = q.data;
  const dueHint =
    r.daysToDue === null ? undefined : r.daysToDue > 0 ? t("closeout.retention.kpiDueIn", { n: r.daysToDue }) : r.daysToDue === 0 ? t("closeout.retention.kpiDueToday") : t("closeout.retention.kpiOverdue", { n: -r.daysToDue });
  return (
    <div className="space-y-4">
      {!r.retentionDueDate ? (
        <InlineAlert tone="info" title={t("closeout.retention.notHandedOver")}>
          {t("closeout.retention.notHandedOverDesc", { percent: r.retentionPercent, months: r.defectPeriodMonths })}
        </InlineAlert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("closeout.retention.kpiDue")}
          value={r.retentionDueDate ? formatDate(r.retentionDueDate) : "—"}
          icon={CalendarClock}
          tone={r.daysToDue !== null && r.daysToDue <= 0 ? "danger" : "primary"}
          hint={dueHint}
        />
        <KpiCard label={t("closeout.retention.kpiClient")} value={<MoneyText paisa={r.totals.clientHeldPaisa} />} icon={HandCoins} />
        <KpiCard label={t("closeout.retention.kpiSubs")} value={<MoneyText paisa={r.totals.subcontractorHeldPaisa} />} icon={Users} />
        <KpiCard
          label={t("closeout.retention.kpiSnags")}
          value={r.defectSnags.open}
          icon={Wrench}
          tone={r.defectSnags.open ? "warning" : "success"}
          hint={t("closeout.retention.kpiSnagsHint", { n: r.defectSnags.total })}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ClientRetention projectId={projectId} r={r} />
        <ReminderCard projectId={projectId} r={r} />
      </div>
      <SubcontractorRetention projectId={projectId} rows={r.subcontractors} />
    </div>
  );
}

function ClientRetention({ projectId, r }: { projectId: string; r: Retention }) {
  const t = useT();
  const canInvoice = useCan("billing.invoice.create");
  const canSeeInvoices = useCan("billing.invoice.view");
  const c = r.client;
  return (
    <SectionCard
      title={t("closeout.retention.client")}
      description={t("closeout.retention.clientDesc")}
      actions={
        canSeeInvoices ? (
          <Button size="sm" variant={c.canInvoice && canInvoice ? "default" : "outline"} asChild>
            <Link href={projectHref(projectId, "/billing/invoices")}>{c.canInvoice && canInvoice ? t("closeout.retention.createInvoice") : t("closeout.retention.openInvoices")}</Link>
          </Button>
        ) : null
      }
    >
      {!c.hasRetentionStage ? (
        <p className="text-sm text-muted-foreground">{t("closeout.retention.noStage")}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("closeout.retention.stage")}</dt>
            <dd>{c.stageLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("closeout.retention.amount")}</dt>
            <dd>
              <MoneyText paisa={c.amountPaisa} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("closeout.retention.invoice")}</dt>
            <dd>{c.invoice ? t("closeout.retention.invoiceDue", { number: c.invoice.number ?? "—", date: c.invoice.dueDate ? formatDate(c.invoice.dueDate) : "—" }) : t("closeout.retention.noInvoice")}</dd>
          </div>
          {c.invoice ? (
            <div>
              <dt className="text-xs text-muted-foreground">{t("closeout.retention.balance")}</dt>
              <dd>
                <MoneyText paisa={c.invoice.balancePaisa} />
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </SectionCard>
  );
}

function ReminderCard({ projectId, r }: { projectId: string; r: Retention }) {
  const t = useT();
  const canManage = useCan("closeout.handover.manage");
  const [save, { isLoading }] = useUpdateRetentionSettingsMutation();
  const run = useMutationToast();
  const form = useForm<ReminderValues>({ resolver: zodResolver(reminderSchema), values: { reminderDaysBefore: String(r.reminder.daysBefore) } });
  const onSubmit = (v: ReminderValues) =>
    void run(() => save({ projectId, body: { reminderDaysBefore: Math.min(90, Math.max(1, Number(v.reminderDaysBefore ?? 14) || 14)) } }).unwrap(), {
      success: t("closeout.retention.reminderSaved"),
      setError: form.setError,
    });
  return (
    <SectionCard title={t("closeout.retention.reminder")} description={t("closeout.retention.reminderDesc")}>
      <div className="space-y-3">
        {canManage ? (
          <Form form={form} onSubmit={onSubmit} id="reminder-form" className="flex flex-wrap items-end gap-3 space-y-0">
            <NumberField name="reminderDaysBefore" label={t("closeout.retention.daysBefore")} decimals={0} className="w-48" />
            <Button type="submit" variant="outline" disabled={isLoading}>
              {t("closeout.retention.saveReminder")}
            </Button>
          </Form>
        ) : null}
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <BellRing className="size-4" aria-hidden />
            {r.reminder.reminderSentAt ? t("closeout.retention.reminderSent", { date: formatDate(r.reminder.reminderSentAt.slice(0, 10)) }) : t("closeout.retention.notSentYet")}
          </li>
          {r.reminder.dueNotifiedAt ? <li>{t("closeout.retention.dueSent", { date: formatDate(r.reminder.dueNotifiedAt.slice(0, 10)) })}</li> : null}
        </ul>
      </div>
    </SectionCard>
  );
}

function SubcontractorRetention({ projectId, rows }: { projectId: string; rows: RetentionSubcontractor[] }) {
  const t = useT();
  const canAccounts = useCan("labor.account.view");
  const columns: Column<RetentionSubcontractor>[] = [
    {
      id: "name",
      header: t("closeout.retention.colName"),
      sortValue: (s) => s.name,
      cell: (s) => <span className="font-medium">{s.name}</span>,
    },
    { id: "scope", header: t("closeout.retention.colScope"), cell: (s) => s.scope },
    { id: "percent", header: t("closeout.retention.colPercent"), align: "right", cell: (s) => <span className="tabular">{s.retentionPercent}%</span> },
    { id: "held", header: t("closeout.retention.colHeld"), align: "right", cell: (s) => <MoneyText paisa={s.retentionHeldPaisa} /> },
    { id: "released", header: t("closeout.retention.colReleased"), align: "right", cell: (s) => <MoneyText paisa={s.retentionReleasedPaisa} /> },
    {
      id: "release",
      header: t("closeout.retention.colRelease"),
      cell: (s) =>
        s.releasable ? (
          <StatusBadge tone="success" label={t("closeout.retention.releasable")} />
        ) : (
          <StatusBadge tone="neutral" label={s.releaseDate ? t("closeout.retention.held", { date: formatDate(s.releaseDate) }) : t("closeout.retention.heldNoDate")} />
        ),
    },
  ];
  return (
    <SectionCard
      title={t("closeout.retention.subs")}
      description={t("closeout.retention.subsDesc")}
      actions={
        canAccounts ? (
          <Button size="sm" variant="outline" asChild>
            <Link href={projectHref(projectId, "/labor/subcontractor-accounts")}>{t("closeout.retention.openAccounts")}</Link>
          </Button>
        ) : null
      }
      flush
    >
      <DataTable rows={rows} columns={columns} getRowId={(s) => s.assignmentId} empty={{ icon: Users, title: t("closeout.retention.noSubs") }} />
    </SectionCard>
  );
}
