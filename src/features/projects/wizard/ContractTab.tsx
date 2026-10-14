"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useMemo } from "react";
import { Controller, useForm, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useGetPaymentTemplatesQuery, useGetQualityCategoriesQuery } from "@/api/services/masterData.api";
import { useGetSupplyPresetsQuery, useUpdateContractMutation } from "@/api/services/projects.api";
import type { ContractType, ProjectDetail, QualityCategory, SupplyPreset } from "@/api/types";
import { HiddenForRole } from "@/components/common/HiddenForRole";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FieldGrid, Form } from "@/components/forms/Form";
import { useFieldError } from "@/components/forms/FormField";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { RadioCardGroup } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StageEditor } from "@/features/master-data/components/StageEditor";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useMessageT, useT } from "@/i18n/useT";
import { formatPKR, multiplyPaisa } from "@/lib/money";
import { CONTRACT_TYPES, SUPPLY_CATEGORIES } from "../constants";
import { contractSchema } from "./schemas";
import { useReportForm, useWizard, WIZARD_FORM_ID } from "./WizardContext";

type Values = z.input<ReturnType<typeof contractSchema>>;
type Rule = Values["supplyRules"][number];

function rulesFromPreset(preset: SupplyPreset | undefined, defaultCategory: string | null, keep: Rule[] = []): Rule[] {
  return SUPPLY_CATEGORIES.map(({ key }) => {
    const locked = keep.find((r) => r.categoryKey === key && r.locked);
    if (locked) return locked;
    const suppliedBy = preset?.rules.find((r) => r.categoryKey === key)?.suppliedBy ?? "CONTRACTOR";
    return { categoryKey: key, label: key, suppliedBy, qualityCategoryId: suppliedBy === "CONTRACTOR" ? defaultCategory : null, locked: false };
  });
}

function initialValues(p: ProjectDetail, presets: SupplyPreset[], defaultCategory: string | null, defaultStages: Values["stages"]): Values {
  const contractType = (p.contract?.contractType ?? "GREY_OWNER_FINISHING") as ContractType;
  const existing: Rule[] = (p.supplyRules ?? []).map((r) => ({
    categoryKey: r.categoryKey,
    label: r.label,
    suppliedBy: r.suppliedBy,
    qualityCategoryId: r.qualityCategory?.id ?? null,
    locked: r.locked,
  }));
  const supplyRules = existing.length
    ? SUPPLY_CATEGORIES.map(({ key }) => existing.find((r) => r.categoryKey === key) ?? { categoryKey: key, label: key, suppliedBy: "OWNER" as const, qualityCategoryId: null, locked: false })
    : rulesFromPreset(presets.find((x) => x.contractType === contractType), defaultCategory);
  return {
    contractType,
    billingModel: p.contract?.billingModel ?? "STAGE_SCHEDULE",
    contractValuePaisa: p.contract?.contractValuePaisa ?? null,
    ratePerSqftPaisa: p.contract?.ratePerSqftPaisa ?? null,
    retentionPercent: p.contract?.retentionPercent ?? 5,
    defectPeriodMonths: p.contract?.defectPeriodMonths ?? 6,
    supplyRules,
    stages: p.billingStages?.length
      ? p.billingStages.map((s) => ({ label: s.label, percent: s.percent, isRetention: s.isRetention }))
      : defaultStages,
  };
}

function ContractTypeCards({ presets, defaultCategory, disabled }: { presets: SupplyPreset[]; defaultCategory: string | null; disabled: boolean }) {
  const { control, setValue, getValues } = useFormContext<Values>();
  const t = useT();
  const error = useFieldError("contractType");
  const options = CONTRACT_TYPES.map((c) => ({ value: c.value, icon: c.icon, title: t(c.titleKey), description: t(c.descriptionKey), ...(c.badgeKey ? { badge: t(c.badgeKey) } : {}) }));
  return (
    <Controller
      control={control}
      name="contractType"
      render={({ field }) => (
        <div className="space-y-1.5">
          <RadioCardGroup<ContractType>
            ariaLabel={t("projects.section.contractType")}
            columns={3}
            value={field.value}
            disabled={disabled}
            invalid={Boolean(error)}
            options={options}
            onChange={(type) => {
              field.onChange(type);
              // A new contract type starts from its preset (locked rows stay as they are).
              setValue("supplyRules", rulesFromPreset(presets.find((p) => p.contractType === type), defaultCategory, getValues("supplyRules")), {
                shouldDirty: true,
              });
              if (type === "LABOR_ONLY") setValue("billingModel", "RUNNING_BILLS", { shouldDirty: true });
            }}
          />
        </div>
      )}
    />
  );
}

function SupplyTable({ categories, disabled }: { categories: QualityCategory[]; disabled: boolean }) {
  const { control, setValue } = useFormContext<Values>();
  const rules = (useWatch({ control, name: "supplyRules" }) as Rule[]) ?? [];
  const defaultCategory = categories.find((c) => c.isDefault)?.id ?? null;
  const errors = useFormContext<Values>().formState.errors.supplyRules;
  const t = useT();
  const te = useEnumT();
  const tm = useMessageT();
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-2.5 text-start">{t("field.category")}</th>
            <th className="px-4 py-2.5 text-start">{t("projects.section.suppliedBy")}</th>
            <th className="px-4 py-2.5 text-start">{t("projects.section.qualityCategory")}</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, index) => {
            const meta = SUPPLY_CATEGORIES.find((c) => c.key === rule.categoryKey);
            const rowDisabled = disabled || rule.locked;
            const errorText = errors?.[index]?.qualityCategoryId?.message;
            const error = errorText ? tm(errorText) : undefined;
            const categoryLabel = meta ? te("projectSupplyCategory", rule.categoryKey) : rule.label;
            return (
              <tr key={rule.categoryKey} className="border-t">
                <td className="px-4 py-2.5">
                  <span className="font-medium">{categoryLabel}</span>
                  {meta?.oftenChanges ? <StatusBadge tone="warning" label={t("projects.contract.oftenChanges")} className="ms-2 h-5 px-2 text-[11px]" /> : null}
                  {rule.locked ? <Lock className="ms-2 inline size-3.5 text-muted-foreground" aria-label={t("projects.section.locked")} /> : null}
                </td>
                <td className="px-4 py-2">
                  <SegmentedControl<"CONTRACTOR" | "OWNER">
                    ariaLabel={t("projects.contract.suppliedByAria", { category: categoryLabel })}
                    size="sm"
                    disabled={rowDisabled}
                    value={rule.suppliedBy}
                    onChange={(by) => {
                      setValue(`supplyRules.${index}.suppliedBy`, by, { shouldDirty: true });
                      setValue(`supplyRules.${index}.qualityCategoryId`, by === "CONTRACTOR" ? (rule.qualityCategoryId ?? defaultCategory) : null, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    options={[
                      { value: "CONTRACTOR", label: t("projects.section.contractor") },
                      { value: "OWNER", label: t("projects.section.owner") },
                    ]}
                  />
                </td>
                <td className="px-4 py-2">
                  {rule.suppliedBy === "OWNER" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="space-y-1">
                      <Select
                        value={rule.qualityCategoryId ?? ""}
                        disabled={rowDisabled}
                        onValueChange={(v) => setValue(`supplyRules.${index}.qualityCategoryId`, v, { shouldDirty: true, shouldValidate: true })}
                      >
                        <SelectTrigger size="sm" className="w-48" aria-label={t("projects.contract.qualityAria", { category: categoryLabel })} aria-invalid={Boolean(error) || undefined}>
                          <SelectValue placeholder={t("projects.contract.chooseQuality")} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {error ? <p className="text-xs text-destructive">{error}</p> : null}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ValueFields({ coveredArea, seesMoney, disabled }: { coveredArea: number | null; seesMoney: boolean; disabled: boolean }) {
  const contractType = useWatch({ name: "contractType" }) as ContractType;
  const rate = useWatch({ name: "ratePerSqftPaisa" }) as string | null;
  const t = useT();
  if (!seesMoney) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="mb-1 text-sm font-medium">{contractType === "LABOR_ONLY" ? t("projects.section.ratePerSqft") : t("projects.section.contractValue")}</p>
        <HiddenForRole />
      </div>
    );
  }
  if (contractType === "LABOR_ONLY") {
    const total = rate && coveredArea ? multiplyPaisa(rate, coveredArea) : null;
    return (
      <div className="space-y-2">
        <MoneyField name="ratePerSqftPaisa" label={t("projects.section.ratePerSqft")} required suffix={t("projects.unit.perSqft")} disabled={disabled} />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total && rate && coveredArea
            ? t("projects.contract.rateCalc", { rate: formatPKR(rate), area: coveredArea.toLocaleString("en-PK"), total: formatPKR(total) })
            : t("projects.contract.setCoveredFirst")}
        </p>
      </div>
    );
  }
  return <MoneyField name="contractValuePaisa" label={t("projects.section.contractValue")} required disabled={disabled} />;
}

function Schedule({ templates, seesMoney, coveredArea, disabled }: { templates: Array<{ id: string; name: string; stages: Values["stages"] }>; seesMoney: boolean; coveredArea: number | null; disabled: boolean }) {
  const { setValue } = useFormContext<Values>();
  const [contractType, value, rate] = useWatch({ name: ["contractType", "contractValuePaisa", "ratePerSqftPaisa"] }) as [ContractType, string | null, string | null];
  const t = useT();
  const totalPaisa = !seesMoney ? undefined : contractType === "LABOR_ONLY" ? (rate && coveredArea ? multiplyPaisa(rate, coveredArea) : null) : value;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {t("projects.contract.paymentSchedule")}<span className="text-destructive">*</span>
        </p>
        {templates.length && !disabled ? (
          <Select
            value=""
            onValueChange={(id) => {
              const template = templates.find((tpl) => tpl.id === id);
              if (template) setValue("stages", template.stages, { shouldDirty: true, shouldValidate: true });
            }}
          >
            <SelectTrigger size="sm" className="w-56" aria-label={t("projects.contract.startFromTemplate")}>
              <SelectValue placeholder={t("projects.contract.startFromTemplatePh")} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <StageEditor name="stages" totalPaisa={totalPaisa} disabled={disabled} />
    </div>
  );
}

/** Tab 2 — PATCH /projects/:id/contract (supply rules + billing stages). */
export function ContractTab() {
  const { projectId, project, locked, onSaved } = useWizard();
  const seesMoney = useCan("fields.contract");
  const presets = useGetSupplyPresetsQuery();
  const categories = useGetQualityCategoriesQuery();
  const templates = useGetPaymentTemplatesQuery();
  const [save] = useUpdateContractMutation();
  const run = useMutationToast();
  const t = useT();
  const te = useEnumT();
  const schema = useMemo(() => contractSchema(seesMoney), [seesMoney]);

  const defaultCategory = categories.data?.find((c) => c.isDefault)?.id ?? null;
  const defaultTemplate = templates.data?.find((tpl) => tpl.isDefault);
  const defaultStages = useMemo<Values["stages"]>(
    () =>
      defaultTemplate?.stages.map((s) => ({ label: s.label, percent: s.percent, isRetention: Boolean(s.isRetention) })) ?? [
        { label: t("projects.contract.defaultStage"), percent: 100, isRetention: false },
      ],
    [defaultTemplate, t],
  );
  const ready = Boolean(project && presets.data && categories.data && templates.data);
  const values = useMemo(
    () => (ready && project ? initialValues(project, presets.data ?? [], defaultCategory, defaultStages) : undefined),
    [ready, project, presets.data, defaultCategory, defaultStages],
  );
  const form = useForm<Values, unknown, z.output<ReturnType<typeof contractSchema>>>({ resolver: zodResolver(schema), values });
  useReportForm(form);

  if (!projectId || !project) return null;
  if (!ready) {
    return (
      <SectionCard>
        <p className="text-sm text-muted-foreground">{t("projects.contract.loadingOptions")}</p>
      </SectionCard>
    );
  }
  const coveredArea = project.coverage?.coveredAreaSqft ?? null;

  const onSubmit = async (v: z.output<ReturnType<typeof contractSchema>>) => {
    const saved = await run(
      () =>
        save({
          id: projectId,
          body: {
            contractType: v.contractType,
            billingModel: v.billingModel,
            ...(seesMoney && v.contractType !== "LABOR_ONLY" && v.contractValuePaisa ? { contractValuePaisa: v.contractValuePaisa } : {}),
            ...(seesMoney && v.contractType === "LABOR_ONLY" && v.ratePerSqftPaisa ? { ratePerSqftPaisa: v.ratePerSqftPaisa } : {}),
            retentionPercent: v.retentionPercent,
            defectPeriodMonths: v.defectPeriodMonths,
            supplyRules: v.supplyRules
              .filter((r) => !r.locked)
              .map((r) => ({
                categoryKey: r.categoryKey as never,
                suppliedBy: r.suppliedBy,
                qualityCategoryId: r.suppliedBy === "CONTRACTOR" ? r.qualityCategoryId : null,
              })),
            billingStages: v.stages.map((s) => ({ label: s.label, percent: s.percent, ...(s.isRetention ? { isRetention: true } : {}) })),
          },
        }).unwrap(),
      {
        setError: form.setError,
        codeFields: {
          CONTRACT_VALUE_REQUIRED: "contractValuePaisa",
          RATE_REQUIRED: "ratePerSqftPaisa",
          PERCENT_TOTAL_INVALID: "stages",
          RETENTION_STAGE_INVALID: "stages",
          BILLING_STAGES_LOCKED: "stages",
        },
      },
    );
    if (saved) {
      form.reset(initialValues(saved, presets.data ?? [], defaultCategory, defaultStages));
      onSaved(saved);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} id={WIZARD_FORM_ID}>
      <SectionCard title={t("projects.section.contractType")}>
        <ContractTypeCards presets={presets.data ?? []} defaultCategory={defaultCategory} disabled={locked} />
      </SectionCard>
      <SectionCard title={t("projects.section.whoSupplies")} description={t("projects.contract.supplyDesc")}>
        <SupplyTable categories={(categories.data ?? []).filter((c) => !c.isArchived)} disabled={locked} />
      </SectionCard>
      <SectionCard title={t("projects.contract.valueBilling")}>
        <div className="space-y-6">
          <FieldGrid>
            <ValueFields coveredArea={coveredArea} seesMoney={seesMoney} disabled={locked} />
            <SegmentedField
              name="billingModel"
              label={t("projects.contract.billingModel")}
              required
              disabled={locked}
              options={[
                { value: "STAGE_SCHEDULE", label: te("billingModel", "STAGE_SCHEDULE") },
                { value: "RUNNING_BILLS", label: te("billingModel", "RUNNING_BILLS") },
              ]}
            />
          </FieldGrid>
          <Schedule
            templates={(templates.data ?? []).map((tpl) => ({
              id: tpl.id,
              name: tpl.name,
              stages: tpl.stages.map((s) => ({ label: s.label, percent: s.percent, isRetention: Boolean(s.isRetention) })),
            }))}
            seesMoney={seesMoney}
            coveredArea={coveredArea}
            disabled={locked}
          />
          <FieldGrid>
            <NumberField name="retentionPercent" label={t("field.retention")} required unit="%" decimals={2} hint={t("projects.contract.retentionHint")} disabled={locked} />
            <NumberField name="defectPeriodMonths" label={t("projects.contract.defectPeriod")} required unit={t("projects.unit.months")} decimals={0} disabled={locked} />
          </FieldGrid>
          {project.billingStages?.some((s) => s.status !== "UPCOMING") ? (
            <InlineAlert tone="warning">{t("projects.contract.stagesLocked")}</InlineAlert>
          ) : null}
        </div>
      </SectionCard>
    </Form>
  );
}
