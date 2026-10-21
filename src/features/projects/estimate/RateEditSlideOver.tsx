"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useGetCompanyRulebookQuery } from "@/api/services/estimates.api";
import { useUpdateEstimateSettingsMutation } from "@/api/services/projects.api";
import type { BoqLine, EstimateSettingsBody, ProjectEstimate } from "@/api/types";
import { useCan } from "@/components/common/PermissionGate";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { overrideValueSchema } from "@/features/estimates/RulebookSettingsView";
import { fmt, lineText, localized, ruleUnitText } from "@/features/estimates/labels";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { projectOverrides, rateSource } from "./overrides";

const FORM_ID = "boq-rate-edit";

/** What the form needs to know about one rulebook key (from `boq.assumptions`, else the company rulebook). */
interface RateMeta {
  key: string;
  label: string;
  unit: string;
  value: number;
  companyValue: number | null;
  source: "RULEBOOK" | "COMPANY" | "PROJECT";
  safeMin: number;
  safeMax: number;
}

/**
 * "Edit rate" of a BoQ lump-sum / percent line (QA B-05): sets the rulebook value for THIS project
 * (the PROJECT layer, PUT /projects/:id/estimate/settings — every other project value is sent back
 * unchanged). "Use the company value" removes the project's own value.
 */
export function RateEditSlideOver({
  projectId,
  estimate,
  line,
  rateKey,
  locked,
  onClose,
}: {
  projectId: string;
  estimate: ProjectEstimate;
  line: BoqLine | null;
  rateKey: string | null;
  locked: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const language = useLanguage();
  const run = useMutationToast();
  const canManage = useCan("projects.estimate.manage");
  const canRulebook = useCan("rulebook.override.view");
  const [save, { isLoading }] = useUpdateEstimateSettingsMutation();
  const fromAssumptions = estimate.boq?.assumptions?.find((a) => a.key === rateKey);
  const rulebook = useGetCompanyRulebookQuery(undefined, { skip: !rateKey || Boolean(fromAssumptions) || !canRulebook });
  const meta = useMemo<RateMeta | null>(() => {
    if (!rateKey) return null;
    const p = estimate.boq?.parameters[rateKey];
    if (fromAssumptions) {
      return {
        key: rateKey,
        label: language === "roman-ur" ? fromAssumptions.labelRoman || fromAssumptions.label : language === "ur" ? fromAssumptions.labelUrdu || fromAssumptions.label : fromAssumptions.label,
        unit: ruleUnitText(t, { key: rateKey, unit: fromAssumptions.unit }),
        value: fromAssumptions.value,
        companyValue: fromAssumptions.companyValue,
        source: fromAssumptions.source,
        safeMin: fromAssumptions.safeMin,
        safeMax: fromAssumptions.safeMax,
      };
    }
    const r = rulebook.data?.parameters.find((x) => x.key === rateKey);
    if (!r && !p) return null;
    return {
      key: rateKey,
      label: r ? localized(r.label, language) : line ? lineText(t, line) : rateKey,
      unit: r ? ruleUnitText(t, r) : "",
      value: p?.value ?? r?.value ?? 0,
      companyValue: r?.value ?? null,
      source: p?.source ?? r?.source ?? "RULEBOOK",
      safeMin: r?.safeMin ?? 0,
      safeMax: r?.safeMax ?? 10_000_000,
    };
  }, [rateKey, estimate.boq, fromAssumptions, rulebook.data, language, t, line]);

  const schema = useMemo(() => overrideValueSchema(meta ?? { safeMin: 0, safeMax: Number.MAX_SAFE_INTEGER }), [meta]);
  const form = useForm({ resolver: zodResolver(schema), values: { value: meta?.value ?? null, note: "" } });
  const editable = canManage && !locked;

  const send = async (value: number | null) => {
    if (!meta) return;
    const body = projectOverrides(estimate);
    if (value === null) delete body[meta.key];
    else body[meta.key] = value;
    const ok = await run(() => save({ projectId, body: body as EstimateSettingsBody }).unwrap(), {
      success: value === null ? t("projects.estimate.rate.reset", { item: meta.label }) : t("projects.estimate.rate.saved", { item: meta.label }),
      setError: form.setError,
      codeFields: { OUT_OF_SAFE_RANGE: "value", UNKNOWN_PARAMETER: "value" },
    });
    if (ok) onClose();
  };

  return (
    <SlideOver
      open={Boolean(line)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={line ? t("projects.estimate.rate.title", { item: lineText(t, line) }) : ""}
      description={t("projects.estimate.rate.description")}
      busy={isLoading}
      footer={
        editable && meta ? (
          <FormActions
            formId={FORM_ID}
            submitLabel={t("common.save")}
            loading={isLoading}
            onCancel={onClose}
            align="between"
            extra={
              meta.source === "PROJECT" ? (
                <Button type="button" variant="outline" disabled={isLoading} onClick={() => void send(null)}>
                  {t("projects.estimate.rate.useCompany")}
                </Button>
              ) : undefined
            }
          />
        ) : undefined
      }
    >
      {!meta ? (
        <p className="text-sm text-muted-foreground">{t("projects.estimate.rate.unknown")}</p>
      ) : (
        <Form form={form} onSubmit={(v) => send(v.value as number)} id={FORM_ID}>
          <p className="text-sm font-medium">{meta.label}</p>
          <NumberField
            name="value"
            label={t("projects.estimate.rate.valueLabel")}
            required
            unit={meta.unit}
            decimals={4}
            min={meta.safeMin}
            max={meta.safeMax}
            hint={t("projects.estimate.rate.range", { min: fmt(meta.safeMin), max: fmt(meta.safeMax) })}
            disabled={!editable}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge tone={meta.source === "PROJECT" ? "warning" : "neutral"} label={t(`projects.estimate.rate.source.${meta.source}`)} />
            {meta.companyValue !== null ? <span>{t("projects.estimate.rate.companyValue", { value: `${fmt(meta.companyValue)} ${meta.unit}`.trim() })}</span> : null}
          </div>
          {!editable ? <p className="text-xs text-muted-foreground">{t("projects.estimate.settings.readOnly")}</p> : null}
        </Form>
      )}
    </SlideOver>
  );
}

/**
 * The "change this rate" link under a BoQ line's rate (QA B-05): lump sums / percents open the
 * project value editor, materials the price list, labour the sub-contract rates.
 */
export function RateAction({ line, onEdit }: { line: BoqLine; onEdit: (line: BoqLine, key: string) => void }) {
  const t = useT();
  const canPrices = useCan("masterdata.pricelist.view");
  const canLabour = useCan("masterdata.laborrate.view");
  const source = rateSource(line);
  if (!source) return null;
  if (source.kind === "RULEBOOK") {
    return (
      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onEdit(line, source.key)} aria-label={t("projects.estimate.rate.editFor", { item: lineText(t, line) })}>
        {t("projects.estimate.rate.edit")}
      </Button>
    );
  }
  const href = source.kind === "PRICE_LIST" ? (canPrices ? "/settings/price-list" : null) : canLabour ? "/settings/labor-rates" : null;
  if (!href) return null;
  return (
    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
      <Link href={href}>{t(source.kind === "PRICE_LIST" ? "projects.estimate.rate.priceList" : "projects.estimate.rate.labourRates")}</Link>
    </Button>
  );
}
