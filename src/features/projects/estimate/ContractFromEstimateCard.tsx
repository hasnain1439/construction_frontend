"use client";

import { ArrowRight, BadgeCheck, Calculator, Loader2 } from "lucide-react";
import { useState } from "react";
import { useContractFromEstimateMutation } from "@/api/services/projects.api";
import type { ContractSuggestion, ProjectDetail, ProjectEstimate } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { NumberInput } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { differencePaisa, suggestionBreakdown } from "./contractSuggestion";
import { fmt, rupees } from "./labels";

/** Who may set the contract value from the estimate: edit + see the contract value + see the cost. */
export function useCanSetContractFromEstimate() {
  const edit = useCan("projects.project.edit");
  const contract = useCan("fields.contract");
  const rates = useCan("fields.rates");
  return edit && contract && rates;
}

/** "Rs 480 / sq ft" for a rate, "Rs 60,15,000" for a value. */
function useValueText(kind: ContractSuggestion["kind"]) {
  const t = useT();
  return (paisa: string | null) => (paisa === null ? "—" : kind === "RATE_PER_SQFT" ? t("projects.estimate.contract.rateValue", { value: rupees(paisa) }) : rupees(paisa));
}

/** "From company settings (20%)" / "Custom for this project (25%)". */
function SourceNote({ value, companyValue }: { value: number | null; companyValue: number }) {
  const t = useT();
  if (value === null) return null;
  const company = value === companyValue;
  return (
    <p className={cn("text-xs", company ? "text-muted-foreground" : "font-medium text-primary")} data-testid="margin-source">
      {company ? t("projects.estimate.contract.fromCompany", { n: fmt(companyValue) }) : t("projects.estimate.contract.custom", { n: fmt(value) })}
    </p>
  );
}

const inRange = (v: number | null, max: number): v is number => v !== null && v >= 0 && v <= max;

/**
 * Sets the contract value (labour-only: the rate per sq ft) from the estimate:
 * cost × (1 + finishing %) × (1 + margin %). Margin / finishing start from the project override or
 * the company defaults. An existing value is replaced only after a confirmation. With `onFinalize`
 * (wizard step 6) a "Finalize estimate" button applies it and moves on.
 */
export function ContractFromEstimateCard({
  projectId,
  estimate,
  locked,
  onApplied,
  onFinalize,
}: {
  projectId: string;
  estimate: ProjectEstimate;
  locked?: boolean;
  onApplied?: (project: ProjectDetail) => void;
  onFinalize?: () => void;
}) {
  const s = estimate.contractSuggestion;
  const allowed = useCanSetContractFromEstimate();
  if (!s || !allowed || locked) return null;
  // Remount when the stored percentages change (after an apply) so the inputs start from them again.
  return <CardBody key={`${s.marginPercent}-${s.finishingAllowancePercent}-${s.kind}`} projectId={projectId} s={s} onApplied={onApplied} onFinalize={onFinalize} />;
}

function CardBody({
  projectId,
  s,
  onApplied,
  onFinalize,
}: {
  projectId: string;
  s: ContractSuggestion;
  onApplied?: (project: ProjectDetail) => void;
  onFinalize?: () => void;
}) {
  const t = useT();
  const valueText = useValueText(s.kind);
  const [margin, setMargin] = useState<number | null>(s.marginPercent);
  const [finishing, setFinishing] = useState<number | null>(s.finishingApplies ? s.finishingAllowancePercent : 0);
  const [confirm, setConfirm] = useState<null | "use" | "finalize">(null);
  const [apply, { isLoading }] = useContractFromEstimateMutation();
  const run = useMutationToast();

  const rate = s.kind === "RATE_PER_SQFT";
  const valid = inRange(margin, 100) && (!s.finishingApplies || inRange(finishing, 200));
  const b = suggestionBreakdown(s.kind, s.basisPaisa, margin ?? 0, s.finishingApplies ? (finishing ?? 0) : 0, s.coveredAreaSqft);
  const suggested = valid ? b.suggested : null;
  const diff = differencePaisa(suggested, s.currentPaisa);
  const diffText = diff === null ? "" : `${diff.startsWith("-") ? "−" : "+"}${rupees(diff.replace("-", ""))}`;

  const submit = async (mode: "use" | "finalize") => {
    if (!valid || suggested === null) return;
    const result = await run(
      () =>
        apply({
          id: projectId,
          body: {
            marginPercent: margin ?? 0,
            ...(s.finishingApplies ? { finishingAllowancePercent: finishing ?? 0 } : {}),
            replace: s.currentPaisa !== null,
          },
        }).unwrap(),
      { success: rate ? t("projects.estimate.contract.appliedRate", { value: rupees(suggested) }) : t("projects.estimate.contract.appliedValue", { value: rupees(suggested) }) },
    );
    setConfirm(null);
    if (!result) return;
    onApplied?.(result);
    if (mode === "finalize") onFinalize?.();
  };
  // A value already there is never replaced without asking.
  const request = (mode: "use" | "finalize") => (s.currentPaisa !== null ? setConfirm(mode) : void submit(mode));

  const row = (label: string, value: string, strong = false) => (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5", strong && "border-t pt-2.5 text-base font-semibold")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );

  return (
    <SectionCard title={t("projects.estimate.contract.title")} description={rate ? t("projects.estimate.contract.descRate") : t("projects.estimate.contract.desc")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]" data-testid="contract-from-estimate">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="estimate-margin">{t("projects.estimate.contract.margin")}</Label>
            <NumberInput id="estimate-margin" value={margin} onChange={setMargin} unit="%" decimals={2} aria-invalid={!inRange(margin, 100) || undefined} />
            {inRange(margin, 100) ? (
              <SourceNote value={margin} companyValue={s.companyMarginPercent} />
            ) : (
              <p className="text-xs text-destructive">{t("projects.estimate.contract.range", { max: 100 })}</p>
            )}
          </div>
          {s.finishingApplies ? (
            <div className="space-y-1.5">
              <Label htmlFor="estimate-finishing">{t("projects.estimate.contract.finishing")}</Label>
              <NumberInput id="estimate-finishing" value={finishing} onChange={setFinishing} unit="%" decimals={2} aria-invalid={!inRange(finishing, 200) || undefined} />
              {inRange(finishing, 200) ? (
                <SourceNote value={finishing} companyValue={s.companyFinishingAllowancePercent} />
              ) : (
                <p className="text-xs text-destructive">{t("projects.estimate.contract.range", { max: 200 })}</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {s.finishingApplies ? <InlineAlert tone="info">{t("projects.estimate.contract.finishingNote")}</InlineAlert> : null}
          <div className="text-sm" data-testid="contract-breakdown">
            {row(rate ? t("projects.estimate.contract.labour") : t("projects.estimate.contract.cost"), rupees(b.basis))}
            {s.finishingApplies ? row(t("projects.estimate.contract.plusFinishing", { n: fmt(finishing ?? 0) }), rupees(b.finishing)) : null}
            {row(t("projects.estimate.contract.plusMargin", { n: fmt(margin ?? 0) }), rupees(b.margin))}
            {rate ? row(t("projects.estimate.contract.coveredArea"), t("projects.estimate.contract.sqft", { n: fmt(s.coveredAreaSqft) })) : null}
            {row(rate ? t("projects.estimate.contract.suggestedRate") : t("projects.estimate.contract.suggestedValue"), valueText(suggested), true)}
            <p className="text-xs text-muted-foreground">{rate ? t("projects.estimate.contract.roundedRate") : t("projects.estimate.contract.roundedValue")}</p>
          </div>
          {s.suggestedPaisa === null && BigInt(s.basisPaisa) <= BigInt(0) ? (
            <InlineAlert tone="warning">{rate ? t("projects.estimate.contract.noLabour") : t("projects.estimate.contract.noCost")}</InlineAlert>
          ) : null}
          {s.currentPaisa !== null ? (
            <p className="text-sm" data-testid="contract-current">
              {t("projects.estimate.contract.current", { value: valueText(s.currentPaisa) })}
              {diff !== null ? <span className={cn("ms-2 tabular", diff.startsWith("-") ? "text-danger" : "text-success")}>{t("projects.estimate.contract.difference", { value: diffText })}</span> : null}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button type="button" variant={onFinalize ? "outline" : "default"} disabled={!suggested || isLoading} onClick={() => request("use")}>
              {isLoading && !onFinalize ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Calculator data-icon="inline-start" />}
              {rate ? t("projects.estimate.contract.useRate") : t("projects.estimate.contract.useValue")}
            </Button>
            {onFinalize ? (
              <Button type="button" disabled={!suggested || isLoading} onClick={() => request("finalize")}>
                {isLoading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <BadgeCheck data-icon="inline-start" />}
                {t("projects.estimate.contract.finalize")}
                <ArrowRight data-icon="inline-end" className="rtl:-scale-x-100" />
              </Button>
            ) : null}
          </div>
          {onFinalize ? <p className="text-end text-xs text-muted-foreground">{t("projects.estimate.contract.finalizeHint")}</p> : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone="default"
        loading={isLoading}
        title={rate ? t("projects.estimate.contract.confirmTitleRate") : t("projects.estimate.contract.confirmTitle")}
        description={t("projects.estimate.contract.confirmDesc", { current: valueText(s.currentPaisa), next: valueText(suggested), diff: diffText })}
        confirmLabel={t("projects.estimate.contract.confirmLabel")}
        onConfirm={() => (confirm ? submit(confirm) : undefined)}
      />
    </SectionCard>
  );
}

/** Review: one click next to CONTRACT_VALUE_MISSING — applies the effective margin (company default or project override). */
export function ApplyMarginAction({ projectId, estimate }: { projectId: string; estimate: ProjectEstimate | undefined }) {
  const t = useT();
  const allowed = useCanSetContractFromEstimate();
  const [apply, { isLoading }] = useContractFromEstimateMutation();
  const run = useMutationToast();
  const s = estimate?.contractSuggestion;
  const valueText = useValueText(s?.kind ?? "CONTRACT_VALUE");
  if (!allowed || !s || s.currentPaisa !== null || s.suggestedPaisa === null) return null;
  const suggested = s.suggestedPaisa;
  const label = t(s.marginSource === "COMPANY" ? "projects.estimate.contract.reviewApply" : "projects.estimate.contract.reviewApplyProject", {
    n: fmt(s.marginPercent),
    value: valueText(suggested),
  });
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isLoading}
      onClick={() =>
        void run(() => apply({ id: projectId, body: { replace: false } }).unwrap(), {
          success: s.kind === "RATE_PER_SQFT" ? t("projects.estimate.contract.appliedRate", { value: rupees(suggested) }) : t("projects.estimate.contract.appliedValue", { value: rupees(suggested) }),
        })
      }
    >
      {isLoading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Calculator data-icon="inline-start" />}
      {label}
    </Button>
  );
}
