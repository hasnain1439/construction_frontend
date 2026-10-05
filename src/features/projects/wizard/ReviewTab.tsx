"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useGetReviewQuery } from "@/api/services/projects.api";
import type { ProjectReview, ReviewIssue } from "@/api/types";
import { ErrorState } from "@/components/common/ErrorState";
import { InfoList } from "@/components/common/InfoList";
import { MoneyText } from "@/components/common/MoneyText";
import { PercentTotalChip, percentTotal } from "@/components/common/PercentTotalChip";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/phone";
import { BILLING_MODEL_LABEL } from "@/lib/options";
import { CONTRACT_TYPE_LABEL, PLOT_UNIT_LABEL, STRUCTURE_LABEL, WIZARD_STEPS } from "../constants";
import { formatArea } from "../utils/calc";
import { useWizard } from "./WizardContext";

function IssueList({ issues, tone, onGo }: { issues: ReviewIssue[]; tone: "danger" | "warning"; onGo: (tab: number) => void }) {
  const Icon = tone === "danger" ? CircleX : TriangleAlert;
  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <li
          key={`${issue.code}-${issue.tab}`}
          className={tone === "danger" ? "flex items-center gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-2.5" : "flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5"}
        >
          <Icon className={tone === "danger" ? "size-4 shrink-0 text-danger" : "size-4 shrink-0 text-warning"} aria-hidden />
          <span className="flex-1 text-sm">{issue.message}</span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onGo(issue.tab)}>
            Go to {WIZARD_STEPS.find((s) => s.id === issue.tab)?.label ?? `tab ${issue.tab}`}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Summary({ review }: { review: ProjectReview }) {
  const { project } = useWizard();
  const s = review.summary;
  const stages = project?.billingStages ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Project & client">
        <InfoList
          items={[
            { label: "Project", value: project ? `${project.name} (${project.code})` : "—" },
            { label: "Client", value: s.client ? `${s.client.name} · ${formatPhone(s.client.phone)}` : "—" },
            { label: "Site", value: [project?.siteAddress, project?.city].filter(Boolean).join(", ") || "—" },
            { label: "Team", value: [project?.team.pm?.name, ...(project?.team.munshis.map((m) => m.name) ?? [])].filter(Boolean).join(", ") || "Not assigned" },
          ]}
        />
      </SectionCard>
      <SectionCard title="Contract & payment schedule" actions={stages.length ? <PercentTotalChip total={percentTotal(stages.map((x) => x.percent))} /> : null}>
        <InfoList
          items={[
            { label: "Contract type", value: s.contract.contractType ? CONTRACT_TYPE_LABEL[s.contract.contractType] : "—" },
            { label: "Billing", value: s.contract.billingModel ? BILLING_MODEL_LABEL[s.contract.billingModel] : "—" },
            { label: "Contract total", value: <MoneyText paisa={s.contract.contractTotalPaisa} /> },
            { label: "Stages", value: s.contract.billingStages },
            { label: "Retention", value: `${s.contract.retentionPercent}%` },
            { label: "Defect period", value: `${s.contract.defectPeriodMonths} months` },
          ]}
        />
      </SectionCard>
      <SectionCard title="Plot & structure">
        <InfoList
          items={[
            { label: "Plot", value: s.plot.plotUnit && s.plot.plotSize ? `${s.plot.plotSize} ${PLOT_UNIT_LABEL[s.plot.plotUnit]} = ${formatArea(s.plot.plotAreaSqft)} sq ft` : "—" },
            { label: "Front × depth", value: s.plot.frontFt && s.plot.depthFt ? `${s.plot.frontFt} × ${s.plot.depthFt} ft${s.plot.cornerPlot ? " · corner" : ""}` : "—" },
            { label: "Structure", value: s.structure.structureType ? STRUCTURE_LABEL[s.structure.structureType] : "—" },
            { label: "Floors", value: `${s.structure.floors}${s.structure.hasBasement ? " (with basement)" : ""}` },
          ]}
        />
      </SectionCard>
      <SectionCard title="Coverage & boundary">
        <InfoList
          items={[
            { label: "Covered", value: s.coverage.coveredAreaSqft ? `${formatArea(s.coverage.coveredAreaSqft)} sq ft` : "—" },
            { label: "Semi-covered", value: `${formatArea(s.coverage.semiCoveredSqft)} sq ft` },
            { label: "Open", value: `${formatArea(s.coverage.openAreaSqft)} sq ft` },
            { label: "Boundary wall", value: s.coverage.boundaryWall ? "Yes" : "No" },
          ]}
        />
      </SectionCard>
      <SectionCard title="Rooms per floor" flush>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Floor</th>
              <th className="px-4 py-2 text-right">Rooms</th>
              <th className="px-4 py-2 text-right">Floor area</th>
              <th className="px-4 py-2 text-right">Net wall</th>
            </tr>
          </thead>
          <tbody>
            {s.roomsPerFloor.map((f) => (
              <tr key={f.level} className="border-t">
                <td className="px-4 py-2">{f.name}</td>
                <td className="px-4 py-2 text-right tabular">{f.rooms}</td>
                <td className="px-4 py-2 text-right tabular">{formatArea(f.totalFloorAreaSqft)}</td>
                <td className="px-4 py-2 text-right tabular">{formatArea(f.netWallAreaSqft)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      <SectionCard title="Supply split">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="info" label={`Contractor supplies ${s.supply.contractor}`} />
          <StatusBadge tone="neutral" label={`Owner supplies ${s.supply.owner}`} />
        </div>
      </SectionCard>
    </div>
  );
}

/** Tab 6 — GET /projects/:id/review: errors block activation, warnings don't. */
export function ReviewTab() {
  const { projectId, goTo } = useWizard();
  const { data, isLoading, error, refetch } = useGetReviewQuery(projectId ?? "", { skip: !projectId, refetchOnMountOrArgChange: true });
  if (!projectId) return null;
  if (isLoading) return <CardsSkeleton count={4} height="h-40" />;
  if (error || !data) {
    return (
      <SectionCard>
        <ErrorState error={error} onRetry={refetch} />
      </SectionCard>
    );
  }
  return (
    <div className="space-y-6">
      {data.ready ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm font-medium">
          <CircleCheck className="size-5 text-success" aria-hidden />
          Everything needed is filled in. You can activate the project.
        </div>
      ) : null}
      {data.errors.length ? (
        <SectionCard title={`Fix before activating (${data.errors.length})`}>
          <IssueList issues={data.errors} tone="danger" onGo={goTo} />
        </SectionCard>
      ) : null}
      {data.warnings.length ? (
        <SectionCard title={`Check these (${data.warnings.length})`} description="Warnings don't block activation.">
          <IssueList issues={data.warnings} tone="warning" onGo={goTo} />
        </SectionCard>
      ) : null}
      <Summary review={data} />
    </div>
  );
}
