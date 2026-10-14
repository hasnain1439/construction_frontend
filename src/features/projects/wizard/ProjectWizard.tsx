"use client";

import { ArrowLeft, ArrowRight, Loader2, Rocket, Save } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useActivateProjectMutation, useGetProjectQuery, useGetReviewQuery } from "@/api/services/projects.api";
import type { ProjectDetail } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { useCan } from "@/components/common/PermissionGate";
import { ReadOnlyBanner } from "@/components/common/ReadOnlyBanner";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StepTabs, type Step } from "@/components/common/StepTabs";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { errorCode } from "@/lib/apiErrors";
import { projectHref } from "@/lib/navigation";
import { useStatusT, useT } from "@/i18n/useT";
import { LOCKED_STATUSES, WIZARD_STEPS } from "../constants";
import { BasicTab } from "./BasicTab";
import { ContractTab } from "./ContractTab";
import { CoverageTab } from "./CoverageTab";
import { PlotStructureTab } from "./PlotStructureTab";
import { ReviewTab } from "./ReviewTab";
import { RoomsTab } from "./RoomsTab";
import { WIZARD_FORM_ID, WizardContext, type WizardContextValue } from "./WizardContext";

const TABS: Record<number, () => ReactNode> = {
  1: () => <BasicTab />,
  2: () => <ContractTab />,
  3: () => <PlotStructureTab />,
  4: () => <CoverageTab />,
  5: () => <RoomsTab />,
  6: () => <ReviewTab />,
};

/** Back · Save as draft · Next (or Activate) — shown in the header and the sticky footer. */
function WizardActions({
  tab,
  locked,
  project,
  saving,
  activating,
  onBack,
  onIntent,
  onNextNoForm,
  onActivate,
  showBack,
}: {
  tab: number;
  locked: boolean;
  project: ProjectDetail | null;
  saving: boolean;
  activating: boolean;
  onBack: () => void;
  onIntent: (intent: "next" | "draft") => void;
  onNextNoForm: () => void;
  onActivate: () => void;
  showBack: boolean;
}) {
  const t = useT();
  const formTab = tab <= 4;
  const canActivate = useCan("projects.project.approve");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showBack && tab > 1 ? (
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" className="rtl:-scale-x-100" />
          {t("common.back")}
        </Button>
      ) : null}
      {formTab && !locked ? (
        <Button type="submit" form={WIZARD_FORM_ID} variant="outline" disabled={saving} onClick={() => onIntent("draft")}>
          <Save data-icon="inline-start" />
          {t("projects.wizard.saveDraft")}
        </Button>
      ) : null}
      {tab < 6 ? (
        formTab && !locked ? (
          <Button type="submit" form={WIZARD_FORM_ID} disabled={saving} onClick={() => onIntent("next")}>
            {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {tab === 1 && !project ? t("projects.wizard.createContinue") : t("common.next")}
            <ArrowRight data-icon="inline-end" className="rtl:-scale-x-100" />
          </Button>
        ) : (
          <Button type="button" onClick={onNextNoForm} disabled={!project}>
            {t("common.next")}
            <ArrowRight data-icon="inline-end" className="rtl:-scale-x-100" />
          </Button>
        )
      ) : project?.status === "DRAFT" && !locked && canActivate ? (
        <Button type="button" variant="success" onClick={onActivate} disabled={activating}>
          {activating ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Rocket data-icon="inline-start" />}
          {t("projects.wizard.activate")}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * New / edit project: full page, 6 numbered tabs. Each tab is its own form that PATCHes
 * its section; the backend records completed steps (green checks) and the review lists
 * what's missing (red dots).
 */
export function ProjectWizard({ projectId, mode, initialTab }: { projectId: string | null; mode: "new" | "edit"; initialTab: number }) {
  const t = useT();
  const ts = useStatusT();
  const router = useRouter();
  const pathname = usePathname();
  const readOnlyCompany = useReadOnly();
  const projectQuery = useGetProjectQuery(projectId ?? "", { skip: !projectId });
  const review = useGetReviewQuery(projectId ?? "", { skip: !projectId });
  const [activate, { isLoading: activating }] = useActivateProjectMutation();
  const run = useMutationToast();
  const [tab, setTabState] = useState(projectId ? initialTab : 1);
  const [visited, setVisited] = useState<number[]>([initialTab]);
  const [formState, setFormStateRaw] = useState({ dirty: false, submitting: false });
  const setFormState = useCallback((next: { dirty: boolean; submitting: boolean }) => {
    setFormStateRaw((current) => (current.dirty === next.dirty && current.submitting === next.submitting ? current : next));
  }, []);
  const dirty = formState.dirty;
  const saving = formState.submitting;
  const [pendingTab, setPendingTab] = useState<number | null>(null);
  const intentRef = useRef<"next" | "draft">("next");

  const project = projectQuery.data ?? null;
  const locked = Boolean(readOnlyCompany || (project && LOCKED_STATUSES.includes(project.status)));

  const setTab = useCallback(
    (next: number) => {
      setTabState(next);
      setVisited((v) => (v.includes(next) ? v : [...v, next]));
      const url = mode === "new" && projectId ? `/projects/new?id=${projectId}&tab=${next}` : `${pathname}?tab=${next}`;
      // Shallow URL update (Next keeps useSearchParams in sync) — no server round-trip per tab.
      window.history.replaceState(null, "", url);
      document.getElementById("main")?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [mode, pathname, projectId],
  );

  const goTo = useCallback((next: number) => (dirty ? setPendingTab(next) : setTab(next)), [dirty, setTab]);

  const onSaved = useCallback(
    (saved?: ProjectDetail) => {
      const intent = intentRef.current;
      if (!projectId && saved) {
        router.replace(`/projects/new?id=${saved.id}&tab=${intent === "next" ? 2 : 1}`);
        return;
      }
      if (intent === "draft") toast.success(t("projects.wizard.savedDraft"));
      else {
        toast.success(t("projects.wizard.stepSaved", { step: t(WIZARD_STEPS[tab - 1].labelKey) }));
        setTab(Math.min(6, tab + 1));
      }
    },
    [projectId, router, setTab, tab, t],
  );

  const context = useMemo<WizardContextValue>(
    () => ({ projectId, project, locked, onSaved, setFormState, goTo }),
    [projectId, project, locked, onSaved, setFormState, goTo],
  );

  const completed = project?.wizardCompletedSteps ?? [];
  const errorTabs = new Set((review.data?.errors ?? []).map((e) => e.tab));
  const steps: Step[] = WIZARD_STEPS.map((s) => ({
    id: s.id,
    label: t(s.labelKey),
    completed: completed.includes(s.id),
    hasError: errorTabs.has(s.id) && (completed.includes(s.id) || visited.includes(s.id) || s.id < tab),
    disabled: !projectId && s.id > 1,
  }));

  const onActivate = async () => {
    if (!projectId) return;
    const result = await run(() => activate(projectId).unwrap(), {
      onError: (code) => {
        if (code === "PROJECT_NOT_READY") {
          toast.error(t("projects.wizard.fixErrorsFirst"));
          void review.refetch();
          return true;
        }
        return false;
      },
    });
    if (result) {
      toast.success(t("projects.wizard.activated"));
      router.push(projectHref(projectId, "/overview"));
    }
  };

  if (projectId && projectQuery.isLoading) return <CardsSkeleton count={3} height="h-48" />;
  if (projectId && projectQuery.error && !project) {
    return (
      <SectionCard>
        <ErrorState error={projectQuery.error} onRetry={projectQuery.refetch} title={errorCode(projectQuery.error) === "PROJECT_NOT_FOUND" ? t("projects.wizard.notFound") : undefined} />
      </SectionCard>
    );
  }

  const actions = (showBack: boolean) => (
    <WizardActions
      tab={tab}
      locked={locked}
      project={project}
      saving={saving}
      activating={activating}
      onBack={() => goTo(tab - 1)}
      onIntent={(intent) => {
        intentRef.current = intent;
      }}
      onNextNoForm={() => setTab(Math.min(6, tab + 1))}
      onActivate={() => void onActivate()}
      showBack={showBack}
    />
  );

  return (
    <WizardContext.Provider value={context}>
      <div className="space-y-6 pb-4">
        <PageHeader
          title={mode === "new" ? t("projects.wizard.newTitle") : project ? t("projects.wizard.editTitle", { name: project.name }) : t("projects.wizard.editProject")}
          meta={project ? <StatusBadge domain="project" value={project.status} /> : null}
          description={project ? `${project.code}${project.client ? ` · ${project.client.name}` : ""}` : t("projects.wizard.newDesc")}
          breadcrumbs={[
            { label: t("crumb.projects"), href: "/projects" },
            ...(mode === "edit" && project ? [{ label: project.name, href: projectHref(project.id, "/overview") }] : []),
            { label: mode === "new" ? t("projects.wizard.newTitle") : t("common.edit") },
          ]}
          actions={actions(false)}
        />
        {locked && project ? (
          <ReadOnlyBanner
            message={
              readOnlyCompany
                ? t("projects.wizard.companyReadOnly")
                : t("projects.wizard.projectLocked", { status: ts("project", project.status) })
            }
          />
        ) : null}
        <StepTabs steps={steps} current={tab} onSelect={goTo} ariaLabel={t("projects.wizard.stepsAria")} />
        <div role="tabpanel" id={`step-panel-${tab}`} aria-labelledby={`step-tab-${tab}`}>
          {TABS[tab]()}
        </div>
        <div className="sticky bottom-0 z-10 -mx-6 flex justify-end border-t bg-background/95 px-6 py-3 backdrop-blur">{actions(true)}</div>
      </div>
      <ConfirmDialog
        open={pendingTab !== null}
        onOpenChange={(o) => !o && setPendingTab(null)}
        title={t("projects.wizard.discardTitle")}
        description={t("projects.wizard.discardDesc", { step: t(WIZARD_STEPS[tab - 1].labelKey) })}
        confirmLabel={t("action.discard")}
        onConfirm={() => {
          const next = pendingTab;
          setPendingTab(null);
          if (next) setTab(next);
        }}
      />
    </WizardContext.Provider>
  );
}

