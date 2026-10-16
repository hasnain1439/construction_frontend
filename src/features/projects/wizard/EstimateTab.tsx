"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useGetEstimateQuery } from "@/api/services/projects.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { usePermissions } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { REVIEW_STEP, WIZARD_STEPS } from "../constants";
import { ContractFromEstimateCard } from "../estimate/ContractFromEstimateCard";
import {
  EstimateBasis,
  EstimateCostSummary,
  EstimateKpis,
  EstimateLabour,
  EstimateMaterialSummary,
  EstimateStageSection,
  EstimateWarnings,
} from "../estimate/EstimateView";
import { EstimateSettingsModal } from "../estimate/EstimateSettingsModal";
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
            <EstimateWarnings project={project} warnings={e.warnings} onGoToTab={{ go: goTo, label: stepLabel }} />
            {!money ? <InlineAlert tone="info">{t("projects.estimate.noAccessCost")}</InlineAlert> : null}
            <ContractFromEstimateCard projectId={projectId} estimate={e} locked={locked} onFinalize={() => goTo(REVIEW_STEP)} />
            <EstimateMaterialSummary estimate={e} />
            {e.stages.map((stage) => (
              <EstimateStageSection key={stage.stage} stage={stage} money={money} hasFoundation={hasFoundation} collapsible />
            ))}
            <EstimateLabour estimate={e} collapsible />
            {e.cost ? <EstimateCostSummary estimate={e} /> : null}
            <EstimateBasis estimate={e} />
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
