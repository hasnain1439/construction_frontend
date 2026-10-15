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
import { strings as projectStrings } from "@/i18n/areas/projects/en";
import { type TranslationKey, useEnumT, useT } from "@/i18n/useT";
import { formatPhone } from "@/lib/phone";
import { FoundationSummary } from "../components/FoundationSummary";
import { WIZARD_STEPS } from "../constants";
import { formatArea } from "../utils/calc";
import { useWizard } from "./WizardContext";

type IssueCode = keyof typeof projectStrings.issue;

/** Translated review issue: known codes use the dictionary, numbers ({a}, {b}) come from the server message. */
function useIssueText() {
  const t = useT();
  return (issue: ReviewIssue) => {
    let code = issue.code;
    if (code === "CONTRACT_VALUE_MISSING" && /rate/i.test(issue.message)) code = "CONTRACT_RATE_MISSING";
    if (!(code in projectStrings.issue)) return issue.message;
    const [a = "", b = ""] = issue.message.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
    return t(`projects.issue.${code as IssueCode}` as TranslationKey, { a, b });
  };
}

function IssueList({ issues, tone, onGo }: { issues: ReviewIssue[]; tone: "danger" | "warning"; onGo: (tab: number) => void }) {
  const Icon = tone === "danger" ? CircleX : TriangleAlert;
  const t = useT();
  const issueText = useIssueText();
  const stepLabel = (tab: number) => {
    const step = WIZARD_STEPS.find((s) => s.id === tab);
    return step ? t(step.labelKey) : t("projects.review.tabN", { n: tab });
  };
  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <li
          key={`${issue.code}-${issue.tab}`}
          className={tone === "danger" ? "flex items-center gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-2.5" : "flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5"}
        >
          <Icon className={tone === "danger" ? "size-4 shrink-0 text-danger" : "size-4 shrink-0 text-warning"} aria-hidden />
          <span className="flex-1 text-sm">{issueText(issue)}</span>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onGo(issue.tab)}>
            {t("projects.review.goTo", { step: stepLabel(issue.tab) })}
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
  const t = useT();
  const te = useEnumT();
  const sqft = (n: number | null | undefined) => t("projects.unit.sqftValue", { n: formatArea(n) });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title={t("projects.review.projectClient")}>
        <InfoList
          items={[
            { label: t("field.project"), value: project ? `${project.name} (${project.code})` : "—" },
            { label: t("field.client"), value: s.client ? `${s.client.name} · ${formatPhone(s.client.phone)}` : "—" },
            { label: t("field.site"), value: [project?.siteAddress, project?.city].filter(Boolean).join(", ") || "—" },
            { label: t("field.team"), value: [project?.team.pm?.name, ...(project?.team.munshis.map((m) => m.name) ?? [])].filter(Boolean).join(", ") || t("projects.review.notAssigned") },
          ]}
        />
      </SectionCard>
      <SectionCard title={t("projects.review.contractSchedule")} actions={stages.length ? <PercentTotalChip total={percentTotal(stages.map((x) => x.percent))} /> : null}>
        <InfoList
          items={[
            { label: t("projects.section.contractType"), value: s.contract.contractType ? te("projectContractType", s.contract.contractType) : "—" },
            { label: t("projects.section.billing"), value: s.contract.billingModel ? te("billingModel", s.contract.billingModel) : "—" },
            { label: t("projects.section.contractTotal"), value: <MoneyText paisa={s.contract.contractTotalPaisa} /> },
            { label: t("projects.review.stages"), value: s.contract.billingStages },
            { label: t("field.retention"), value: `${s.contract.retentionPercent}%` },
            { label: t("projects.contract.defectPeriod"), value: t("projects.unit.monthsValue", { n: s.contract.defectPeriodMonths }) },
          ]}
        />
      </SectionCard>
      <SectionCard title={t("projects.review.plotStructure")}>
        <InfoList
          items={[
            { label: t("projects.section.plot"), value: s.plot.plotUnit && s.plot.plotSize ? t("projects.plot.plotResult", { size: String(s.plot.plotSize), unit: te("projectPlotUnit", s.plot.plotUnit), area: formatArea(s.plot.plotAreaSqft) }) : "—" },
            { label: t("projects.section.frontDepth"), value: s.plot.frontFt && s.plot.depthFt ? t(s.plot.cornerPlot ? "projects.review.frontDepthCorner" : "projects.review.frontDepthValue", { front: String(s.plot.frontFt), depth: String(s.plot.depthFt) }) : "—" },
            { label: t("projects.section.structure"), value: s.structure.structureType ? te("projectStructureType", s.structure.structureType) : "—" },
            { label: t("projects.section.floors"), value: s.structure.hasBasement ? t("projects.review.floorsWithBasement", { n: s.structure.floors }) : String(s.structure.floors) },
          ]}
        />
      </SectionCard>
      <SectionCard title={t("projects.section.coverageBoundary")}>
        <InfoList
          items={[
            { label: t("projects.section.covered"), value: s.coverage.coveredAreaSqft ? sqft(s.coverage.coveredAreaSqft) : "—" },
            { label: t("projects.section.semiCovered"), value: sqft(s.coverage.semiCoveredSqft) },
            { label: t("projects.section.open"), value: sqft(s.coverage.openAreaSqft) },
            { label: t("projects.section.boundaryWall"), value: s.coverage.boundaryWall ? t("common.yes") : t("common.no") },
          ]}
        />
      </SectionCard>
      <SectionCard title={t("projects.foundation.title")} className="lg:col-span-2">
        <FoundationSummary foundation={s.foundation} />
      </SectionCard>
      <SectionCard title={t("projects.review.roomsPerFloor")} flush>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2 text-start">{t("projects.section.floor")}</th>
              <th className="px-4 py-2 text-end">{t("projects.section.rooms")}</th>
              <th className="px-4 py-2 text-end">{t("projects.section.floorArea")}</th>
              <th className="px-4 py-2 text-end">{t("projects.section.netWall")}</th>
            </tr>
          </thead>
          <tbody>
            {s.roomsPerFloor.map((f) => (
              <tr key={f.level} className="border-t">
                <td className="px-4 py-2">{te("projectFloorLevel", f.level, f.name)}</td>
                <td className="px-4 py-2 text-end tabular">{f.rooms}</td>
                <td className="px-4 py-2 text-end tabular">{formatArea(f.totalFloorAreaSqft)}</td>
                <td className="px-4 py-2 text-end tabular">{formatArea(f.netWallAreaSqft)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      <SectionCard title={t("projects.review.supplySplit")}>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="info" label={t("projects.review.contractorSupplies", { n: s.supply.contractor })} />
          <StatusBadge tone="neutral" label={t("projects.review.ownerSupplies", { n: s.supply.owner })} />
        </div>
      </SectionCard>
    </div>
  );
}

/** Tab 6 — GET /projects/:id/review: errors block activation, warnings don't. */
export function ReviewTab() {
  const { projectId, goTo } = useWizard();
  const t = useT();
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
          {t("projects.review.ready")}
        </div>
      ) : null}
      {data.errors.length ? (
        <SectionCard title={t("projects.review.fixBefore", { n: data.errors.length })}>
          <IssueList issues={data.errors} tone="danger" onGo={goTo} />
        </SectionCard>
      ) : null}
      {data.warnings.length ? (
        <SectionCard title={t("projects.review.checkThese", { n: data.warnings.length })} description={t("projects.review.warningsDontBlock")}>
          <IssueList issues={data.warnings} tone="warning" onGo={goTo} />
        </SectionCard>
      ) : null}
      <Summary review={data} />
    </div>
  );
}
