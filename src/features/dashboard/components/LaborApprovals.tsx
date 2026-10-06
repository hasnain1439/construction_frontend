"use client";

import { FileSpreadsheet, Ruler } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetLaborOverviewQuery, useGetSettlementsQuery } from "@/api/services/labor.api";
import { DataTable } from "@/components/common/DataTable";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { PendingKharcha, TopupTable } from "@/features/cashbook/views/CashViews";
import { ReadyStagesApprovals } from "./BillingOverview";
import { formatDateTime } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import { formatWeekRange } from "@/lib/weeks";

/** Labour & cash decisions on "My Approvals": wages, kharcha above the limit, top-ups. */
export function LaborApprovals() {
  const router = useRouter();
  const owner = useCan({ roles: ["THEKEDAR"] });
  const settlements = useGetSettlementsQuery({ status: "SUBMITTED", limit: 50 });
  const overview = useGetLaborOverviewQuery();
  return (
    <>
      <SectionCard
        flush
        title={
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" aria-hidden />
            Weekly wages waiting for approval
          </span>
        }
      >
        <DataTable
          rows={settlements.data?.items}
          getRowId={(s) => s.id}
          loading={settlements.isLoading}
          error={settlements.error}
          onRetry={settlements.refetch}
          onRowClick={(s) => router.push(projectHref(s.project.id, `/labor/settlements/${s.id}`))}
          empty={{ title: "No wages waiting", compact: true }}
          columns={[
            { id: "project", header: "Site", cell: (s) => <span className="font-medium">{s.project.name}</span> },
            { id: "week", header: "Week", cell: (s) => formatWeekRange(s.weekStart) },
            { id: "workers", header: "Workers", align: "right", cell: (s) => s.workers },
            { id: "net", header: "To pay", align: "right", cell: (s) => <MoneyText paisa={s.netPaisa} className="font-semibold" /> },
            { id: "by", header: "Submitted", cell: (s) => [s.submittedBy?.name, s.submittedAt ? formatDateTime(s.submittedAt) : null].filter(Boolean).join(" · ") },
            { id: "status", header: "", cell: (s) => <StatusBadge domain="settlement" value={s.status} /> },
            { id: "action", header: <span className="sr-only">Action</span>, align: "right", cell: () => <Button size="sm" variant="outline">Review</Button> },
          ]}
        />
      </SectionCard>
      {owner ? <ReadyStagesApprovals /> : null}
      <PendingKharcha />
      {owner ? (
        <SectionCard flush title="Top-up requests">
          <TopupTable status="PENDING" />
        </SectionCard>
      ) : null}
      {overview.data?.pending.measurements ? (
        <SectionCard>
          <p className="flex items-center gap-2 text-sm">
            <Ruler className="size-4 text-warning" aria-hidden />
            {overview.data.pending.measurements} work measurement{overview.data.pending.measurements === 1 ? "" : "s"} to verify — open the project’s Labor → Work Measurements.
          </p>
        </SectionCard>
      ) : null}
    </>
  );
}
