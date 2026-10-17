"use client";

import {
  BookOpen,
  CircleCheck,
  EyeOff,
  FileText,
  FlaskConical,
  FolderKanban,
  Forklift,
  HardHat,
  ImageUp,
  Landmark,
  PackageSearch,
  Receipt,
  Trash2,
  Truck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  useCreateDemoMutation,
  useDeleteDemoMutation,
  useDismissSetupChecklistMutation,
  useGetSetupChecklistQuery,
  useMarkRatesReviewedMutation,
} from "@/api/services/onboarding.api";
import type { ChecklistStepKey, SetupChecklist as Checklist } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useCan, usePermissions } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT, type TranslationKey } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import type { AccessRule } from "@/lib/permissions";
import { DemoBadge } from "./DemoBadge";

const STEPS: Record<
  ChecklistStepKey,
  { href: string; icon: LucideIcon; label: TranslationKey; importHref?: string }
> = {
  LOGO: { href: "/settings/company", icon: ImageUp, label: "onboarding.stepLOGO" },
  RATES: { href: "/settings/price-list", icon: PackageSearch, label: "onboarding.stepRATES" },
  TEAM: { href: "/team/invitations?new=1", icon: UserPlus, label: "onboarding.stepTEAM" },
  WORKERS: {
    href: "/workforce/workers?new=1",
    icon: HardHat,
    label: "onboarding.stepWORKERS",
    importHref: "/workforce/workers?import=1",
  },
  SUPPLIERS: {
    href: "/suppliers-stock/suppliers?new=1",
    icon: Truck,
    label: "onboarding.stepSUPPLIERS",
    importHref: "/suppliers-stock/suppliers?import=1",
  },
  PROJECT: { href: "/projects/new", icon: FolderKanban, label: "onboarding.stepPROJECT" },
};

/**
 * Step 18 · optional Phase 2 / 3 steps under the checklist: links only (they don't count in the
 * progress), each shown with the key its page needs. Hidden together with the checklist.
 */
const OPTIONAL_STEPS: Array<{ id: string; href: string; icon: LucideIcon; label: TranslationKey; access: AccessRule }> = [
  { id: "rulebook", href: "/settings/rulebook", icon: BookOpen, label: "onboarding.moreRULEBOOK", access: { permission: "rulebook.override.view" } },
  { id: "quote", href: "/sales/quotes/new", icon: FileText, label: "onboarding.moreQUOTE", access: { permission: "sales.quote.create" } },
  { id: "equipment", href: "/equipment/owned", icon: Forklift, label: "onboarding.moreEQUIPMENT", access: { allPermissions: ["equipment.view", "equipment.manage"] } },
  { id: "tax", href: "/settings/tax", icon: Receipt, label: "onboarding.moreTAX", access: { permission: "tax.view" } },
];

function OptionalSteps() {
  const t = useT();
  const { canAccess } = usePermissions();
  const steps = OPTIONAL_STEPS.filter((s) => canAccess(s.access));
  if (!steps.length) return null;
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{t("onboarding.moreTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("onboarding.moreDesc")}</p>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.id}>
              <Link href={s.href} className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm underline-offset-2 hover:underline">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {t(s.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Progress bar drawn with a width, so it fills from the start side in both LTR and RTL. */
function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** "Try with demo data" / "Remove demo data" with its confirmation. */
export function DemoDataControls({ demo, compact }: { demo: Checklist["demo"]; compact?: boolean }) {
  const t = useT();
  const readOnly = useReadOnly();
  const run = useMutationToast();
  const [create, { isLoading: creating }] = useCreateDemoMutation();
  const [remove, { isLoading: removing }] = useDeleteDemoMutation();
  const [confirm, setConfirm] = useState(false);
  if (readOnly) return null;

  if (!demo) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-dashed p-4 sm:flex-row sm:items-center",
          compact && "p-3",
        )}
      >
        <FlaskConical className="size-6 shrink-0 text-warning" aria-hidden />
        <p className="flex-1 text-sm text-muted-foreground">{t("demo.tryDesc")}</p>
        <Button
          variant="outline"
          disabled={creating}
          onClick={() =>
            void run(() => create().unwrap(), { success: (r) => t("demo.created", { code: r.project.code }) })
          }
        >
          <FlaskConical data-icon="inline-start" />
          {creating ? t("demo.creating") : t("demo.try")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center">
      <DemoBadge isDemo />
      <p className="flex-1 text-sm">
        <Link
          className="font-medium underline-offset-2 hover:underline"
          href={`/projects/${demo.id}/overview`}
        >
          {demo.name}
        </Link>{" "}
        <span className="text-muted-foreground">({demo.code})</span>
      </p>
      <Button variant="outline" onClick={() => setConfirm(true)}>
        <Trash2 data-icon="inline-start" />
        {t("demo.remove")}
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("demo.removeTitle")}
        description={t("demo.removeBody")}
        confirmLabel={t("demo.remove")}
        tone="danger"
        loading={removing}
        onConfirm={async () => {
          const ok = await run(() => remove().unwrap(), { success: t("demo.removed") });
          if (ok) setConfirm(false);
        }}
      />
    </div>
  );
}

/**
 * Dashboard → first-login setup checklist (owner): progress from GET /onboarding/checklist,
 * a link per step, "My rates are fine", opening balances, demo data, and Hide. When hidden,
 * only the demo controls stay (while there is demo data to remove).
 */
export function SetupChecklist() {
  const t = useT();
  const isOwner = useCan("company.settings.manage");
  const canOpening = useCan("company.opening.manage");
  const readOnly = useReadOnly();
  const run = useMutationToast();
  const { data } = useGetSetupChecklistQuery(undefined, { skip: !isOwner });
  const [dismiss, { isLoading: hiding }] = useDismissSetupChecklistMutation();
  const [ratesReviewed, { isLoading: confirming }] = useMarkRatesReviewedMutation();
  if (!isOwner || !data) return null;

  if (data.dismissed) {
    return data.demo ? (
      <div className="mb-4">
        <DemoDataControls demo={data.demo} compact />
      </div>
    ) : null;
  }

  const progressText = t("onboarding.progress", { done: data.completed, total: data.total });
  return (
    <SectionCard
      title={t("onboarding.title")}
      description={data.allDone ? t("onboarding.allDone") : progressText}
      actions={
        readOnly ? null : (
          <Button
            variant="ghost"
            size="sm"
            disabled={hiding}
            onClick={() =>
              void run(() => dismiss({ dismissed: true }).unwrap(), { success: t("onboarding.hidden") })
            }
          >
            <EyeOff data-icon="inline-start" />
            {t("onboarding.hide")}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProgressBar percent={data.percent} label={progressText} />
          <span className="tabular shrink-0 text-sm font-semibold" dir="ltr">
            {data.percent}%
          </span>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.steps.map(({ key, done }) => {
            const step = STEPS[key];
            const Icon = step.icon;
            return (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-muted p-3 pe-4",
                  done && "bg-success-soft",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    done ? "bg-success text-white" : "bg-card text-foreground shadow-card",
                  )}
                >
                  {done ? (
                    <CircleCheck className="size-5" aria-hidden />
                  ) : (
                    <Icon className="size-5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={step.href}
                    className={cn(
                      "text-sm font-medium underline-offset-2 hover:underline",
                      done && "text-muted-foreground line-through",
                    )}
                  >
                    {t(step.label)}
                  </Link>
                  <span className="sr-only"> ({done ? t("onboarding.done") : t("onboarding.toDo")})</span>
                  {!done && step.importHref ? (
                    <Link
                      href={step.importHref}
                      className="block text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {t("onboarding.importInstead")}
                    </Link>
                  ) : null}
                  {!done && key === "RATES" && !readOnly ? (
                    <button
                      type="button"
                      disabled={confirming}
                      className="block text-xs text-primary underline-offset-2 hover:underline"
                      onClick={() =>
                        void run(() => ratesReviewed().unwrap(), { success: t("onboarding.ratesConfirmed") })
                      }
                    >
                      {t("onboarding.ratesFine")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <OptionalSteps />
        {canOpening ? (
          <Link
            href="/settings/opening-balances"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            <Landmark className="size-4" aria-hidden />
            {t("onboarding.openingLink")}
          </Link>
        ) : null}
        <DemoDataControls demo={data.demo} />
      </div>
    </SectionCard>
  );
}
