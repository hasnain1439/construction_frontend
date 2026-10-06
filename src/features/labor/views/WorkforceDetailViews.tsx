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
import { paidFromLabel, rateTypeLabel, workerTypeLabel } from "../options";

const ProjectLink = ({ project, path }: { project: { id: string; name: string; code: string }; path: string }) => (
  <Link href={projectHref(project.id, path)} className="font-medium text-primary underline-offset-4 hover:underline">
    {project.name}
  </Link>
);

export function WorkerDetailView({ workerId }: { workerId: string }) {
  const q = useGetWorkerSummaryQuery(workerId);
  return (
    <QueryState query={q} skeleton={<CardsSkeleton count={3} height="h-32" />}>
      {(d) => (
        <>
          <PageHeader
            title={d.worker.name}
            meta={<StatusBadge domain="active" value={d.worker.isActive} />}
            description={[workerTypeLabel(d.worker.type), d.worker.phone ? formatPhone(d.worker.phone) : null, `normal rate ${formatPKR(d.worker.dailyRatePaisa)} / day`].filter(Boolean).join(" · ")}
            breadcrumbs={[{ label: "Workforce" }, { label: "Workers Directory", href: "/workforce/workers" }, { label: d.worker.name }]}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Sites now" icon={HardHat} value={d.projects.filter((p) => p.isActive).length} />
            <KpiCard label="Days this week" icon={CalendarCheck} value={d.thisWeek.daysWorked} hint={`Week of ${formatWeekRange(d.thisWeek.weekStart)}`} />
            <KpiCard label="Peshgi outstanding" icon={HandCoins} tone={d.outstandingAdvancePaisa === "0" ? "success" : "warning"} value={formatPKRShort(d.outstandingAdvancePaisa)} />
          </div>
          <SectionCard flush title="Sites">
            <DataTable
              rows={d.projects}
              getRowId={(p) => p.projectWorkerId}
              empty={{ title: "Not on any site", compact: true }}
              columns={[
                { id: "project", header: "Project", cell: (p) => <ProjectLink project={p.project} path="/labor/team" /> },
                { id: "rate", header: "Rate / day", align: "right", cell: (p) => <MoneyText paisa={p.dailyRatePaisa} /> },
                { id: "from", header: "From", cell: (p) => formatDate(p.startDate) },
                { id: "to", header: "Until", cell: (p) => (p.endDate ? formatDate(p.endDate) : "—") },
                { id: "status", header: "Status", cell: (p) => <StatusBadge domain="active" value={p.isActive} /> },
              ]}
            />
          </SectionCard>
          <SectionCard flush title="Wages (last 12 weeks)">
            <DataTable
              rows={d.settlements}
              getRowId={(l) => l.settlementId}
              empty={{ title: "No settlements yet", compact: true }}
              columns={[
                { id: "week", header: "Week", cell: (l) => <Link className="text-primary underline-offset-4 hover:underline" href={projectHref(l.project.id, `/labor/settlements/${l.settlementId}`)}>{formatWeekRange(l.weekStart)}</Link> },
                { id: "project", header: "Site", cell: (l) => l.project.name },
                { id: "days", header: "Days", align: "right", cell: (l) => l.daysWorked },
                { id: "gross", header: "Wages", align: "right", cell: (l) => <MoneyText paisa={l.grossPaisa} /> },
                { id: "peshgi", header: "Peshgi cut", align: "right", cell: (l) => <MoneyText paisa={l.advanceAdjustedPaisa} /> },
                { id: "net", header: "Net", align: "right", cell: (l) => <MoneyText paisa={l.netPaisa} className="font-semibold" /> },
                { id: "status", header: "Status", cell: (l) => (l.status === "APPROVED" ? <StatusBadge domain="linePayment" value={l.paymentStatus} /> : <StatusBadge domain="settlement" value={l.status} />) },
              ]}
            />
          </SectionCard>
          <SectionCard flush title="Peshgi">
            <DataTable
              rows={d.advances}
              getRowId={(a) => a.id}
              empty={{ title: "No peshgi", compact: true }}
              columns={[
                { id: "date", header: "Date", cell: (a) => formatDate(a.date) },
                { id: "project", header: "Site", cell: (a) => a.project.name },
                { id: "amount", header: "Amount", align: "right", cell: (a) => <MoneyText paisa={a.amountPaisa} /> },
                { id: "from", header: "Paid from", cell: (a) => paidFromLabel(a.paidFrom) },
                { id: "note", header: "Note", cell: (a) => <span className="text-sm text-muted-foreground">{a.note ?? ""}</span> },
              ]}
            />
          </SectionCard>
        </>
      )}
    </QueryState>
  );
}

export function SubcontractorDetailView({ subcontractorId }: { subcontractorId: string }) {
  const q = useGetSubcontractorSummaryQuery(subcontractorId);
  return (
    <QueryState query={q} skeleton={<CardsSkeleton count={3} height="h-32" />}>
      {(d) => (
        <>
          <PageHeader
            title={d.subcontractor.name}
            meta={<StatusBadge domain="active" value={d.subcontractor.isActive} />}
            description={[workerTypeLabel(d.subcontractor.trade), d.subcontractor.phone ? formatPhone(d.subcontractor.phone) : null].filter(Boolean).join(" · ")}
            breadcrumbs={[{ label: "Workforce" }, { label: "Sub-contractors", href: "/workforce/subcontractors" }, { label: d.subcontractor.name }]}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Work value" icon={CircleDollarSign} value={formatPKRShort(d.totals.valuePaisa)} />
            <KpiCard label="Paid" icon={Banknote} value={formatPKRShort(d.totals.paidPaisa)} />
            <KpiCard label="Retention held" icon={Wallet} value={formatPKRShort(d.totals.retentionHeldPaisa)} />
            <KpiCard label="Balance due" icon={d.totals.balanceDuePaisa.startsWith("-") ? BadgeAlert : HandCoins} tone={d.totals.balanceDuePaisa.startsWith("-") ? "danger" : "primary"} value={formatPKRShort(d.totals.balanceDuePaisa)} />
          </div>
          <SectionCard flush title="Sub-contracts">
            <DataTable
              rows={d.assignments}
              getRowId={(a) => a.id}
              empty={{ title: "No sub-contracts yet", compact: true }}
              columns={[
                {
                  id: "project",
                  header: "Site / work",
                  cell: (a) => (
                    <div>
                      <ProjectLink project={a.project} path="/labor/subcontractor-accounts" />
                      <p className="text-xs text-muted-foreground">{a.scope}</p>
                    </div>
                  ),
                },
                {
                  id: "rate",
                  header: "Rate",
                  cell: (a) => (a.rateType === "LUMPSUM" ? <span>Lump sum <MoneyText paisa={a.contractValuePaisa ?? undefined} /> · {a.progressPercent}%</span> : <span><MoneyText paisa={a.ratePaisa ?? undefined} /> / {a.unit}</span>),
                },
                { id: "type", header: "Paid", cell: (a) => rateTypeLabel(a.rateType) },
                { id: "value", header: "Value", align: "right", cell: (a) => <MoneyText paisa={a.account.valuePaisa} /> },
                { id: "paid", header: "Paid", align: "right", cell: (a) => <MoneyText paisa={a.account.paidPaisa} /> },
                {
                  id: "due",
                  header: "Balance due",
                  align: "right",
                  cell: (a) =>
                    a.account.overpaid ? <StatusBadge tone="danger" icon={BadgeAlert} label={`Overpaid ${formatPKR(a.account.overpaidPaisa)}`} /> : <MoneyText paisa={a.account.balanceDuePaisa} className="font-semibold" />,
                },
                { id: "status", header: "Status", cell: (a) => <StatusBadge domain="active" value={a.isActive} /> },
              ]}
            />
          </SectionCard>
        </>
      )}
    </QueryState>
  );
}

