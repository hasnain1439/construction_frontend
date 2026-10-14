"use client";

import { Banknote, BadgeAlert, CalendarCheck, CircleDollarSign, HandCoins, HardHat, Wallet } from "lucide-react";
import Link from "next/link";
import { useGetSubcontractorSummaryQuery, useGetWorkerSummaryQuery } from "@/api/services/labor.api";
import { DataTable } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDate } from "@/lib/dates";
import { formatPKR, formatPKRShort } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { formatPhone } from "@/lib/phone";
import { formatWeekRange } from "@/lib/weeks";
import { useWorkerTypeName } from "@/hooks/useWorkerTypes";
import { namesFromWorker } from "@/lib/workerTypes";
import { useT } from "@/i18n/useT";
import { useLaborLabels } from "../options";

const ProjectLink = ({ project, path }: { project: { id: string; name: string; code: string }; path: string }) => (
  <Link href={projectHref(project.id, path)} className="font-medium text-primary underline-offset-4 hover:underline">
    {project.name}
  </Link>
);

export function WorkerDetailView({ workerId }: { workerId: string }) {
  const t = useT();
  const labels = useLaborLabels();
  const q = useGetWorkerSummaryQuery(workerId);
  const typeName = useWorkerTypeName();
  return (
    <QueryState query={q} skeleton={<CardsSkeleton count={3} height="h-32" />}>
      {(d) => (
        <>
          <PageHeader
            title={d.worker.name}
            meta={<StatusBadge domain="active" value={d.worker.isActive} />}
            description={[typeName(d.worker.type, namesFromWorker(d.worker)), d.worker.phone ? formatPhone(d.worker.phone) : null, t("labor.detail.normalRate", { rate: formatPKR(d.worker.dailyRatePaisa) })].filter(Boolean).join(" · ")}
            breadcrumbs={[{ label: t("crumb.workforce") }, { label: t("labor.detail.workersDirectory"), href: "/workforce/workers" }, { label: d.worker.name }]}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label={t("labor.detail.sitesNow")} icon={HardHat} value={d.projects.filter((p) => p.isActive).length} />
            <KpiCard label={t("labor.detail.daysThisWeek")} icon={CalendarCheck} value={d.thisWeek.daysWorked} hint={t("labor.detail.weekOf", { week: formatWeekRange(d.thisWeek.weekStart) })} />
            <KpiCard label={t("labor.detail.peshgiOutstanding")} icon={HandCoins} tone={d.outstandingAdvancePaisa === "0" ? "success" : "warning"} value={formatPKRShort(d.outstandingAdvancePaisa)} />
          </div>
          <SectionCard flush title={t("labor.detail.sites")}>
            <DataTable
              rows={d.projects}
              getRowId={(p) => p.projectWorkerId}
              empty={{ title: t("labor.detail.notOnSite"), compact: true }}
              columns={[
                { id: "project", header: t("field.project"), cell: (p) => <ProjectLink project={p.project} path="/labor/team" /> },
                { id: "rate", header: t("labor.common.rateDay"), align: "right", cell: (p) => <MoneyText paisa={p.dailyRatePaisa} /> },
                { id: "from", header: t("common.from"), cell: (p) => formatDate(p.startDate) },
                { id: "to", header: t("labor.detail.until"), cell: (p) => (p.endDate ? formatDate(p.endDate) : "—") },
                { id: "status", header: t("field.status"), cell: (p) => <StatusBadge domain="active" value={p.isActive} /> },
              ]}
            />
          </SectionCard>
          <SectionCard flush title={t("labor.detail.wages12")}>
            <DataTable
              rows={d.settlements}
              getRowId={(l) => l.settlementId}
              empty={{ title: t("labor.common.noSettlementsYet"), compact: true }}
              columns={[
                { id: "week", header: t("labor.common.week"), cell: (l) => <Link className="text-primary underline-offset-4 hover:underline" href={projectHref(l.project.id, `/labor/settlements/${l.settlementId}`)}>{formatWeekRange(l.weekStart)}</Link> },
                { id: "project", header: t("field.site"), cell: (l) => l.project.name },
                { id: "days", header: t("labor.common.days"), align: "right", cell: (l) => l.daysWorked },
                { id: "gross", header: t("field.wages"), align: "right", cell: (l) => <MoneyText paisa={l.grossPaisa} /> },
                { id: "peshgi", header: t("labor.common.peshgiCut"), align: "right", cell: (l) => <MoneyText paisa={l.advanceAdjustedPaisa} /> },
                { id: "net", header: t("labor.detail.net"), align: "right", cell: (l) => <MoneyText paisa={l.netPaisa} className="font-semibold" /> },
                { id: "status", header: t("field.status"), cell: (l) => (l.status === "APPROVED" ? <StatusBadge domain="linePayment" value={l.paymentStatus} /> : <StatusBadge domain="settlement" value={l.status} />) },
              ]}
            />
          </SectionCard>
          <SectionCard flush title={t("field.peshgi")}>
            <DataTable
              rows={d.advances}
              getRowId={(a) => a.id}
              empty={{ title: t("labor.detail.noPeshgi"), compact: true }}
              columns={[
                { id: "date", header: t("field.date"), cell: (a) => formatDate(a.date) },
                { id: "project", header: t("field.site"), cell: (a) => a.project.name },
                { id: "amount", header: t("field.amount"), align: "right", cell: (a) => <MoneyText paisa={a.amountPaisa} /> },
                { id: "from", header: t("field.paidFrom"), cell: (a) => labels.paidFrom(a.paidFrom) },
                { id: "note", header: t("field.note"), cell: (a) => <span className="text-sm text-muted-foreground">{a.note ?? ""}</span> },
              ]}
            />
          </SectionCard>
        </>
      )}
    </QueryState>
  );
}

export function SubcontractorDetailView({ subcontractorId }: { subcontractorId: string }) {
  const t = useT();
  const labels = useLaborLabels();
  const q = useGetSubcontractorSummaryQuery(subcontractorId);
  return (
    <QueryState query={q} skeleton={<CardsSkeleton count={3} height="h-32" />}>
      {(d) => (
        <>
          <PageHeader
            title={d.subcontractor.name}
            meta={<StatusBadge domain="active" value={d.subcontractor.isActive} />}
            description={[labels.trade(d.subcontractor.trade), d.subcontractor.phone ? formatPhone(d.subcontractor.phone) : null].filter(Boolean).join(" · ")}
            breadcrumbs={[{ label: t("crumb.workforce") }, { label: t("labor.detail.subcontractors"), href: "/workforce/subcontractors" }, { label: d.subcontractor.name }]}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("labor.common.workValue")} icon={CircleDollarSign} value={formatPKRShort(d.totals.valuePaisa)} />
            <KpiCard label={t("field.paid")} icon={Banknote} value={formatPKRShort(d.totals.paidPaisa)} />
            <KpiCard label={t("labor.common.retentionHeld")} icon={Wallet} value={formatPKRShort(d.totals.retentionHeldPaisa)} />
            <KpiCard label={t("field.balanceDue")} icon={d.totals.balanceDuePaisa.startsWith("-") ? BadgeAlert : HandCoins} tone={d.totals.balanceDuePaisa.startsWith("-") ? "danger" : "primary"} value={formatPKRShort(d.totals.balanceDuePaisa)} />
          </div>
          <SectionCard flush title={t("labor.common.subContracts")}>
            <DataTable
              rows={d.assignments}
              getRowId={(a) => a.id}
              empty={{ title: t("labor.common.noSubContractsYet"), compact: true }}
              columns={[
                {
                  id: "project",
                  header: t("labor.detail.siteWork"),
                  cell: (a) => (
                    <div>
                      <ProjectLink project={a.project} path="/labor/subcontractor-accounts" />
                      <p className="text-xs text-muted-foreground">{a.scope}</p>
                    </div>
                  ),
                },
                {
                  id: "rate",
                  header: t("field.rate"),
                  cell: (a) =>
                    a.rateType === "LUMPSUM" ? (
                      <span>{t("labor.detail.lumpSum", { amount: a.contractValuePaisa ? formatPKR(a.contractValuePaisa) : "—", percent: a.progressPercent })}</span>
                    ) : (
                      <span>
                        <MoneyText paisa={a.ratePaisa ?? undefined} /> {t("labor.common.perUnit", { unit: labels.unit(a.unit) })}
                      </span>
                    ),
                },
                { id: "type", header: t("field.paid"), cell: (a) => labels.rateType(a.rateType) },
                { id: "value", header: t("field.value"), align: "right", cell: (a) => <MoneyText paisa={a.account.valuePaisa} /> },
                { id: "paid", header: t("field.paid"), align: "right", cell: (a) => <MoneyText paisa={a.account.paidPaisa} /> },
                {
                  id: "due",
                  header: t("field.balanceDue"),
                  align: "right",
                  cell: (a) =>
                    a.account.overpaid ? <StatusBadge tone="danger" icon={BadgeAlert} label={t("labor.common.overpaid", { amount: formatPKR(a.account.overpaidPaisa) })} /> : <MoneyText paisa={a.account.balanceDuePaisa} className="font-semibold" />,
                },
                { id: "status", header: t("field.status"), cell: (a) => <StatusBadge domain="active" value={a.isActive} /> },
              ]}
            />
          </SectionCard>
        </>
      )}
    </QueryState>
  );
}

