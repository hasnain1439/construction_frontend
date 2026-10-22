"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useGetPaymentTemplatesQuery, useGetQualityCategoriesQuery } from "@/api/services/masterData.api";
import { useGetSupplyPresetsQuery, useUpdateContractMutation } from "@/api/services/projects.api";
import type { ContractType, PaymentTemplate, ProjectDetail, QualityCategory, SupplyPreset } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { HiddenForRole } from "@/components/common/HiddenForRole";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CheckboxField } from "@/components/forms/CheckboxField";
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
import { defaultTemplateFor, fitStages, runningStages, sameStages, switchContract, templateStages, validRetention, withRetention, type StageValue, type TypeMemory } from "./contractStages";
import { contractSchema } from "./schemas";
import { useReportForm, useWizard, WIZARD_FORM_ID } from "./WizardContext";

type Values = z.input<ReturnType<typeof contractSchema>>;
type Rule = Values["supplyRules"][number];
/** Stage labels the form writes itself (running bills, a new retention row). */
type StageLabels = { running: string; retention: string };

function rulesFromPreset(preset: SupplyPreset | undefined, defaultCategory: string | null, keep: Rule[] = []): Rule[] {
  return SUPPLY_CATEGORIES.map(({ key }) => {
    const locked = keep.find((r) => r.categoryKey === key && r.locked);
    if (locked) return locked;
    const suppliedBy = preset?.rules.find((r) => r.categoryKey === key)?.suppliedBy ?? "CONTRACTOR";
    return { categoryKey: key, label: key, suppliedBy, qualityCategoryId: suppliedBy === "CONTRACTOR" ? defaultCategory : null, locked: false };
  });
}

function initialValues(p: ProjectDetail, presets: SupplyPreset[], defaultCategory: string | null, stagesFor: (type: ContractType, retention: number) => StageValue[]): Values {
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
  const retentionPercent = p.contract?.retentionPercent ?? 5;
  return {
    contractType,
    billingModel: p.contract?.billingModel ?? (contractType === "LABOR_ONLY" ? "RUNNING_BILLS" : "STAGE_SCHEDULE"),
    contractValuePaisa: p.contract?.contractValuePaisa ?? null,
    ratePerSqftPaisa: p.contract?.ratePerSqftPaisa ?? null,
    retentionPercent,
    defectPeriodMonths: p.contract?.defectPeriodMonths ?? 6,
    labourScopeIncludesFinishing: p.contract?.labourScopeIncludesFinishing ?? false,
    labourScopeIncludesMep: p.contract?.labourScopeIncludesMep ?? false,
    supplyRules,
    stages: p.billingStages?.length
      ? p.billingStages.map((s) => ({ label: s.label, percent: s.percent, isRetention: s.isRetention }))
      : stagesFor(contractType, validRetention(retentionPercent) ?? 0),
  };
}

/**
 * Contract type cards. Switching the type asks first (QA B-18): the supply rules restart from the new
 * type's preset, and each type keeps its own contract value, rate and billing (form state) so
 * switching back restores them. The billing model changes only as the dialog says.
 */
function ContractTypeCards({
  presets,
  defaultCategory,
  disabled,
  stagesFor,
  labels,
}: {
  presets: SupplyPreset[];
  defaultCategory: string | null;
  disabled: boolean;
  stagesFor: (type: ContractType, retention: number) => StageValue[];
  labels: StageLabels;
}) {
  const { control, setValue, getValues } = useFormContext<Values>();
  const t = useT();
  const te = useEnumT();
  const error = useFieldError("contractType");
  const memory = useRef<Partial<Record<ContractType, TypeMemory>>>({});
  const [pendingSwitch, setPendingSwitch] = useState<{ type: ContractType; billing: Values["billingModel"] } | null>(null);
  const pending = pendingSwitch?.type ?? null;
  const options = CONTRACT_TYPES.map((c) => ({ value: c.value, icon: c.icon, title: t(c.titleKey), description: t(c.descriptionKey), ...(c.badgeKey ? { badge: t(c.badgeKey) } : {}) }));
  const current = useWatch({ control, name: "contractType" }) as ContractType;
  const billing = useWatch({ control, name: "billingModel" }) as Values["billingModel"];
  const nextBilling = (type: ContractType): Values["billingModel"] => memory.current[type]?.billingModel ?? (type === "LABOR_ONLY" ? "RUNNING_BILLS" : billing);

  const apply = (type: ContractType, billingModel: Values["billingModel"]) => {
    const { values: next, memory: remembered } = switchContract(
      {
        contractType: getValues("contractType") as ContractType,
        contractValuePaisa: getValues("contractValuePaisa") ?? null,
        ratePerSqftPaisa: getValues("ratePerSqftPaisa") ?? null,
        billingModel: getValues("billingModel"),
        stages: getValues("stages") as StageValue[],
      },
      type,
      billingModel,
      memory.current,
      { retention: validRetention(getValues("retentionPercent") as number | null) ?? 0, stagesFor, labels },
    );
    memory.current = remembered;
    setValue("contractType", type, { shouldDirty: true, shouldValidate: true });
    // A new contract type starts from its preset (locked rows stay as they are).
    setValue("supplyRules", rulesFromPreset(presets.find((p) => p.contractType === type), defaultCategory, getValues("supplyRules")), { shouldDirty: true });
    setValue("billingModel", next.billingModel, { shouldDirty: true });
    setValue("contractValuePaisa", next.contractValuePaisa, { shouldDirty: true });
    setValue("ratePerSqftPaisa", next.ratePerSqftPaisa, { shouldDirty: true });
    setValue("stages", next.stages, { shouldDirty: true, shouldValidate: true });
  };

  const billingNote = pendingSwitch && pendingSwitch.billing !== billing ? t("projects.contract.switchBilling", { billing: te("billingModel", pendingSwitch.billing) }) : null;
  return (
    <>
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
              onChange={(type) => (type !== field.value ? setPendingSwitch({ type, billing: nextBilling(type) }) : undefined)}
            />
          </div>
        )}
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => (!o ? setPendingSwitch(null) : undefined)}
        tone="warning"
        title={pending ? t("projects.contract.switchTitle", { type: te("projectContractType", pending) }) : ""}
        description={[
          t("projects.contract.switchDesc", { from: te("projectContractType", current), to: pending ? te("projectContractType", pending) : "" }),
          billingNote,
        ]
          .filter(Boolean)
          .join(" ")}
        confirmLabel={t("projects.contract.switchConfirm")}
        onConfirm={() => {
          if (pendingSwitch) apply(pendingSwitch.type, pendingSwitch.billing);
          setPendingSwitch(null);
        }}
      />
    </>
  );
}

/** Keeps the retention row equal to the retention field (QA B-08); running bills keep their two generated stages. */
function StageSync({ labels }: { labels: StageLabels }) {
  const { control, setValue } = useFormContext<Values>();
  const [retentionRaw, billingModel] = useWatch({ control, name: ["retentionPercent", "billingModel"] }) as [number | null, Values["billingModel"]];
  const watchedStages = useWatch({ control, name: "stages" }) as StageValue[] | undefined;
  const retention = validRetention(retentionRaw);
  useEffect(() => {
    const stages = watchedStages ?? [];
    if (retention === null) return;
    const next = billingModel === "RUNNING_BILLS" ? runningStages(retention, labels.running, labels.retention) : withRetention(stages, retention, labels.retention);
    if (!sameStages(next, stages)) setValue("stages", next, { shouldDirty: true, shouldValidate: true });
  }, [retention, billingModel, watchedStages, labels, setValue]);
  return null;
}

/**
 * Billing model. Running bills hide the stage table (QA B-18) and bill by progress: the stages become
 * one running stage + the retention; switching back to a stage schedule restores the stages typed before.
 */
function BillingModelField({ labels, stagesFor, disabled }: { labels: StageLabels; stagesFor: (type: ContractType, retention: number) => StageValue[]; disabled: boolean }) {
  const { getValues, setValue } = useFormContext<Values>();
  const t = useT();
  const te = useEnumT();
  const schedule = useRef<StageValue[] | null>(null);
  const onChange = (model: Values["billingModel"]) => {
    const retention = validRetention(getValues("retentionPercent") as number | null) ?? 0;
    if (model === "RUNNING_BILLS") {
      const current = getValues("stages") as StageValue[];
      if (!sameStages(current, runningStages(retention, labels.running, labels.retention))) schedule.current = current;
      setValue("stages", runningStages(retention, labels.running, labels.retention), { shouldDirty: true, shouldValidate: true });
    } else {
      const back = schedule.current ? withRetention(schedule.current, retention, labels.retention) : stagesFor(getValues("contractType") as ContractType, retention);
      setValue("stages", back, { shouldDirty: true, shouldValidate: true });
    }
  };
  return (
    <SegmentedField
      name="billingModel"
      label={t("projects.contract.billingModel")}
      required
      disabled={disabled}
      onValueChange={onChange}
      options={[
        { value: "STAGE_SCHEDULE", label: te("billingModel", "STAGE_SCHEDULE") },
        { value: "RUNNING_BILLS", label: te("billingModel", "RUNNING_BILLS") },
      ]}
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

/**
 * Labour-only scope (QE4): by default the labour contract covers the grey structure only; these
 * bring finishing labour (tiles, paint) and electrical + plumbing labour into the estimate.
 */
function LabourScopeFields({ disabled }: { disabled: boolean }) {
  const contractType = useWatch({ name: "contractType" }) as ContractType;
  const t = useT();
  if (contractType !== "LABOR_ONLY") return null;
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-4" data-testid="labour-scope">
      <p className="text-sm font-medium">{t("projects.contract.labourScope")}</p>
      <p className="text-sm text-muted-foreground">{t("projects.contract.labourScopeHint")}</p>
      <CheckboxField name="labourScopeIncludesFinishing" label={t("projects.contract.labourScopeFinishing")} disabled={disabled} />
      <CheckboxField name="labourScopeIncludesMep" label={t("projects.contract.labourScopeMep")} disabled={disabled} />
    </div>
  );
}

/** Contract value (or labour rate) — optional until activation; running bills also need a rate per sq ft. */
function ValueFields({ coveredArea, seesMoney, disabled }: { coveredArea: number | null; seesMoney: boolean; disabled: boolean }) {
  const [contractType, billingModel] = useWatch({ name: ["contractType", "billingModel"] }) as [ContractType, string];
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
        <MoneyField
          name="ratePerSqftPaisa"
          label={t("projects.section.ratePerSqft")}
          suffix={t("projects.unit.perSqft")}
          hint={t("projects.contract.valueLater")}
          disabled={disabled}
        />
        {!coveredArea ? (
          <p className="text-sm text-muted-foreground">{t("projects.contract.setCoveredFirst")}</p>
        ) : total && rate ? (
          <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="labour-total">
            {t("projects.contract.rateCalc", { rate: formatPKR(rate), area: coveredArea.toLocaleString("en-PK"), total: formatPKR(total) })}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <MoneyField name="contractValuePaisa" label={t("projects.section.contractValue")} hint={t("projects.contract.valueLater")} disabled={disabled} />
      {billingModel === "RUNNING_BILLS" ? (
        <MoneyField
          name="ratePerSqftPaisa"
          label={t("projects.contract.runningRate")}
          suffix={t("projects.unit.perSqft")}
          hint={t("projects.contract.runningRateHint")}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

function Schedule({
  templates,
  seesMoney,
  coveredArea,
  disabled,
  labels,
}: {
  templates: PaymentTemplate[];
  seesMoney: boolean;
  coveredArea: number | null;
  disabled: boolean;
  labels: StageLabels;
}) {
  const { setValue, getValues } = useFormContext<Values>();
  const [contractType, value, rate, billingModel, retentionRaw] = useWatch({ name: ["contractType", "contractValuePaisa", "ratePerSqftPaisa", "billingModel", "retentionPercent"] }) as [
    ContractType,
    string | null,
    string | null,
    Values["billingModel"],
    number | null,
  ];
  const t = useT();
  const totalPaisa = !seesMoney ? undefined : contractType === "LABOR_ONLY" ? (rate && coveredArea ? multiplyPaisa(rate, coveredArea) : null) : value;
  const retention = validRetention(retentionRaw) ?? 0;
  // Running bills are billed by progress: no stage table (QA B-18)
  if (billingModel === "RUNNING_BILLS") {
    return (
      <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground" data-testid="running-bills-note">
        {t("projects.contract.runningBillsNote", { running: String(100 - retention), retention: String(retention) })}
      </p>
    );
  }
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
              // The template's retention row takes the project retention; the difference goes to its last stage
              const r = validRetention(getValues("retentionPercent") as number | null) ?? 0;
              if (template) setValue("stages", fitStages(templateStages(template), r, labels.retention), { shouldDirty: true, shouldValidate: true });
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
      <StageEditor name="stages" totalPaisa={totalPaisa} disabled={disabled} retentionLocked />
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
  const schema = useMemo(() => contractSchema(seesMoney), [seesMoney]);

  const defaultCategory = categories.data?.find((c) => c.isDefault)?.id ?? null;
  const labels = useMemo<StageLabels>(() => ({ running: t("projects.contract.runningStage"), retention: t("projects.contract.retentionStage") }), [t]);
  // QA B-35: each contract type starts from its own default template, fitted to the retention (QA B-08)
  const stagesFor = useMemo(() => {
    const list = templates.data ?? [];
    return (type: ContractType, retention: number): StageValue[] => {
      const template = defaultTemplateFor(list, type);
      const base = template ? templateStages(template) : [{ label: t("projects.contract.defaultStage"), percent: 100, isRetention: false }];
      return fitStages(base, retention, labels.retention);
    };
  }, [templates.data, t, labels]);
  const ready = Boolean(project && presets.data && categories.data && templates.data);
  const values = useMemo(
    () => (ready && project ? initialValues(project, presets.data ?? [], defaultCategory, stagesFor) : undefined),
    [ready, project, presets.data, defaultCategory, stagesFor],
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
            // Empty = null (cleared; fine while DRAFT, CONTRACT_VALUE_REQUIRED once active). Without fields.contract nothing is sent (kept).
            ...(seesMoney && v.contractType !== "LABOR_ONLY" ? { contractValuePaisa: v.contractValuePaisa || null } : {}),
            ...(seesMoney && (v.contractType === "LABOR_ONLY" || v.billingModel === "RUNNING_BILLS") ? { ratePerSqftPaisa: v.ratePerSqftPaisa || null } : {}),
            retentionPercent: v.retentionPercent,
            defectPeriodMonths: v.defectPeriodMonths,
            // Labour-only scope (QE4): sent with a labour-only contract; another type keeps what was stored
            ...(v.contractType === "LABOR_ONLY" ? { labourScopeIncludesFinishing: v.labourScopeIncludesFinishing, labourScopeIncludesMep: v.labourScopeIncludesMep } : {}),
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
      form.reset(initialValues(saved, presets.data ?? [], defaultCategory, stagesFor));
      onSaved(saved);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} id={WIZARD_FORM_ID}>
      <SectionCard title={t("projects.section.contractType")}>
        <ContractTypeCards presets={presets.data ?? []} defaultCategory={defaultCategory} disabled={locked} stagesFor={stagesFor} labels={labels} />
        <StageSync labels={labels} />
      </SectionCard>
      <SectionCard title={t("projects.section.whoSupplies")} description={t("projects.contract.supplyDesc")}>
        <SupplyTable categories={(categories.data ?? []).filter((c) => !c.isArchived)} disabled={locked} />
      </SectionCard>
      <SectionCard title={t("projects.contract.valueBilling")}>
        <div className="space-y-6">
          <FieldGrid>
            <ValueFields coveredArea={coveredArea} seesMoney={seesMoney} disabled={locked} />
            <BillingModelField labels={labels} stagesFor={stagesFor} disabled={locked} />
          </FieldGrid>
          <LabourScopeFields disabled={locked} />
          <Schedule templates={templates.data ?? []} seesMoney={seesMoney} coveredArea={coveredArea} disabled={locked} labels={labels} />
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
