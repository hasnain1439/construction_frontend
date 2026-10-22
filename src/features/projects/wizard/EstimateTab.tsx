"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useGetEstimateQuery } from "@/api/services/projects.api";
import type { BoqLine, EstimateWarning } from "@/api/types";
import { CollapsibleSection } from "@/components/common/CollapsibleSection";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { BoqTable } from "@/features/estimates/BoqTable";
import { hasMoney } from "@/features/estimates/labels";
import { usePermissions } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { REVIEW_STEP, WIZARD_STEPS } from "../constants";
import { ContractFromEstimateCard } from "../estimate/ContractFromEstimateCard";
import {
  EstimateBasis,
  EstimateBlockedNotice,
  EstimateCostSummary,
  EstimateKpis,
  EstimateLabour,
  EstimateMaterialSummary,
  EstimateStageSection,
  EstimateWarnings,
} from "../estimate/EstimateView";
import { EstimateSettingsModal } from "../estimate/EstimateSettingsModal";
import { RateAction, RateEditSlideOver } from "../estimate/RateEditSlideOver";
import { isEstimateBlocked } from "../estimate/warningText";
import { useWizard } from "./WizardContext";

/**
 * Tab 6 — the estimate (BoQ) before activation: GET /projects/:id/estimate, refetched every
 * time the tab opens (earlier tabs may have changed). Nothing to save; the Assumptions modal
 * changes the estimate settings (projects.estimate.manage, while the project is editable).
 */
export function EstimateTab() {
  const { projectId, project, locked, goTo } = useWizard();
  const t = useT();
  const { can } = usePermissions();
  const query = useGetEstimateQuery(projectId ?? "", { skip: !projectId, refetchOnMountOrArgChange: true });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rateEdit, setRateEdit] = useState<{ line: BoqLine; key: string } | null>(null);
  if (!projectId || !project) return null;
  const stepLabel = (tab: number) => {
    const step = WIZARD_STEPS.find((s) => s.id === tab);
    return step ? t(step.labelKey) : t("projects.review.tabN", { n: tab });
  };

  return (
    <QueryState query={query} skeleton={<CardsSkeleton count={4} height="h-40" />}>
      {(e) => {
        const money = e.cost !== undefined;
        const hasFoundation = !e.warnings.some((w) => w.code === "FOUNDATION_MISSING");
        const boq = e.boq;
        const seen = new Set<string>();
        // Engine + BoQ warnings, once each (a blocking one, e.g. FOOTPRINT_EXCEEDS_PLOT, shows as an error)
        const warnings = [...e.warnings, ...(boq?.warnings ?? [])].filter((w: EstimateWarning) => {
          const key = `${w.code}.${w.floor?.level ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const warningList = (
          <EstimateWarnings project={project} warnings={warnings} onGoToTab={{ go: goTo, label: stepLabel }} assumptions={boq?.assumptions} />
        );
        // QE4: rooms under 50 % of the covered area → no estimate: the reason and what to add, no numbers
        if (isEstimateBlocked(e)) {
          return (
            <div className="space-y-6" data-testid="wizard-estimate">
              <p className="max-w-3xl text-sm text-muted-foreground">{t("projects.estimate.wizardIntro")}</p>
              {warningList}
              <EstimateBlockedNotice />
            </div>
          );
        }
        const greyWorking = (
          <>
            <EstimateMaterialSummary estimate={e} />
            {e.stages.map((stage) => (
              <EstimateStageSection key={stage.stage} stage={stage} money={money} hasFoundation={hasFoundation} collapsible />
            ))}
            <EstimateLabour estimate={e} collapsible />
          </>
        );
        return (
          <div className="space-y-6" data-testid="wizard-estimate">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-3xl text-sm text-muted-foreground">{t("projects.estimate.wizardIntro")}</p>
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)}>
                <SlidersHorizontal data-icon="inline-start" />
                {t("projects.estimate.assumptions")}
              </Button>
            </div>
            <EstimateKpis estimate={e} compact />
            {warningList}
            {!money ? <InlineAlert tone="info">{t("projects.estimate.noAccessCost")}</InlineAlert> : null}
            <ContractFromEstimateCard projectId={projectId} estimate={e} locked={locked} fromQuote={Boolean(project.createdFromQuoteId)} onFinalize={() => goTo(REVIEW_STEP)} />
            {boq ? (
              // QA B-05: every BoQ section the API returns — lump sums, overheads and contingency included — so Direct = Σ the lines shown
              <div className="space-y-6" data-testid="wizard-boq">
                <BoqTable
                  sections={boq.sections}
                  totals={boq}
                  money={hasMoney(boq)}
                  rateAction={hasMoney(boq) ? (line) => <RateAction line={line} onEdit={(l, key) => setRateEdit({ line: l, key })} /> : undefined}
                />
                <SectionCard flush>
                  <CollapsibleSection title={t("estimates.boq.greyWorking")} defaultOpen={false}>
                    <div className="space-y-6 p-4">
                      <p className="text-sm text-muted-foreground">{t("estimates.boq.greyWorkingDesc")}</p>
                      {greyWorking}
                    </div>
                  </CollapsibleSection>
                </SectionCard>
              </div>
            ) : (
              greyWorking
            )}
            {/* the BoQ KPIs above carry the cost and margin; the grey-structure summary only without them (QA-A-01) */}
            {e.cost && !e.boqCost ? <EstimateCostSummary estimate={e} /> : null}
            <EstimateBasis estimate={e} />
            <RateEditSlideOver projectId={projectId} estimate={e} line={rateEdit?.line ?? null} rateKey={rateEdit?.key ?? null} locked={locked} onClose={() => setRateEdit(null)} />
            {settingsOpen ? (
              <EstimateSettingsModal
                projectId={projectId}
                estimate={e}
                canManage={can("projects.estimate.manage")}
                locked={locked}
                onClose={() => setSettingsOpen(false)}
              />
            ) : null}
          </div>
        );
      }}
    </QueryState>
  );
}
