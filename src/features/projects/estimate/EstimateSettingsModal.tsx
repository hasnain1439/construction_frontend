"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useUpdateEstimateSettingsMutation } from "@/api/services/projects.api";
import type { EstimateSettings, ProjectEstimate } from "@/api/types";
import { FormTabsList, TAB_CONTENT_CLASS } from "@/components/common/FormTabs";
import { InlineAlert } from "@/components/common/InlineAlert";
import { WideModal } from "@/components/common/WideModal";
import { FieldGrid, Form } from "@/components/forms/Form";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useMutationToast } from "@/hooks/useMutationToast";
import { msg } from "@/i18n/message";
import { useT, type TranslationKey } from "@/i18n/useT";
import { formatPKR } from "@/lib/money";
import { fmt } from "./labels";

type Tab = "walls" | "rcc" | "plaster" | "foundation" | "factors";
type UnitKey = "in" | "ft" | "pct" | "cft" | "perCft" | "kgPerBag" | "kgPerSqft" | "litrePerSqft" | "factor";
type NumKey = {
  [K in keyof EstimateSettings]: EstimateSettings[K] extends number | null
    ? EstimateSettings[K] extends string
      ? never
      : K
    : never;
}[keyof EstimateSettings];

interface NumSpec {
  key: NumKey;
  tab: Tab;
  unit: UnitKey;
  min: number;
  max: number;
  decimals?: number;
  hint?: TranslationKey;
  nullable?: boolean;
}

/** Same ranges as the API (src/modules/estimate/settings.ts). */
const NUMBERS: NumSpec[] = [
  { key: "externalWallThicknessIn", tab: "walls", unit: "in", min: 4.5, max: 18 },
  { key: "internalWallThicknessIn", tab: "walls", unit: "in", min: 3, max: 13.5 },
  { key: "parapetHeightFt", tab: "walls", unit: "ft", min: 0, max: 6 },
  { key: "bricksPerCft", tab: "walls", unit: "perCft", min: 10, max: 16 },
  { key: "mortarPerCftBrickwork", tab: "walls", unit: "cft", min: 0.15, max: 0.4 },
  { key: "slabThicknessIn", tab: "rcc", unit: "in", min: 4, max: 9 },
  {
    key: "frameConcretePercent",
    tab: "rcc",
    unit: "pct",
    min: 0,
    max: 100,
    hint: "projects.estimate.settings.f.frameConcretePercentHint",
  },
  {
    key: "slabSteelPercent",
    tab: "rcc",
    unit: "pct",
    min: 0.3,
    max: 3,
    hint: "projects.estimate.settings.f.steelHint",
  },
  {
    key: "frameSteelPercent",
    tab: "rcc",
    unit: "pct",
    min: 0.8,
    max: 6,
    hint: "projects.estimate.settings.f.steelHint",
  },
  { key: "lintelSteelPercent", tab: "rcc", unit: "pct", min: 0.3, max: 3 },
  { key: "footingSteelPercent", tab: "rcc", unit: "pct", min: 0.3, max: 3 },
  { key: "lintelWidthIn", tab: "rcc", unit: "in", min: 4.5, max: 18 },
  { key: "lintelDepthIn", tab: "rcc", unit: "in", min: 3, max: 18 },
  { key: "lintelBearingFt", tab: "rcc", unit: "ft", min: 0, max: 3 },
  { key: "internalPlasterThicknessIn", tab: "plaster", unit: "in", min: 0.25, max: 1.5 },
  { key: "externalPlasterThicknessIn", tab: "plaster", unit: "in", min: 0.25, max: 1.5 },
  { key: "foundationWallLengthFt", tab: "foundation", unit: "ft", min: 10, max: 10000, nullable: true },
  { key: "waterproofingKgPerBag", tab: "foundation", unit: "kgPerBag", min: 0, max: 5 },
  { key: "bitumenKgPerSqft", tab: "foundation", unit: "kgPerSqft", min: 0, max: 2 },
  { key: "termiteLitrePerSqft", tab: "foundation", unit: "litrePerSqft", min: 0, max: 0.1, decimals: 4 },
  { key: "wastagePercent", tab: "factors", unit: "pct", min: 0, max: 25 },
  { key: "brickWastagePercent", tab: "factors", unit: "pct", min: 0, max: 25 },
  { key: "concreteDryFactor", tab: "factors", unit: "factor", min: 1.2, max: 1.7 },
  { key: "mortarDryFactor", tab: "factors", unit: "factor", min: 1.1, max: 1.6 },
  { key: "cementBagCft", tab: "factors", unit: "cft", min: 1, max: 1.5 },
];

const MIXES = {
  masonryMortarMix: { tab: "walls", options: ["1:3", "1:4", "1:5", "1:6", "1:8"] },
  rccMix: { tab: "rcc", options: ["1:1.5:3", "1:2:4"] },
  internalPlasterMix: { tab: "plaster", options: ["1:3", "1:4", "1:5", "1:6"] },
  externalPlasterMix: { tab: "plaster", options: ["1:3", "1:4", "1:5", "1:6"] },
} as const;
type MixKey = keyof typeof MIXES;

const label = (key: keyof EstimateSettings) => `projects.estimate.settings.f.${key}` as TranslationKey;

const schema = z
  .object({
    ...Object.fromEntries(NUMBERS.map((n) => [n.key, z.number().nullable()])),
    masonryMortarMix: z.enum(MIXES.masonryMortarMix.options),
    rccMix: z.enum(MIXES.rccMix.options),
    internalPlasterMix: z.enum(MIXES.internalPlasterMix.options),
    externalPlasterMix: z.enum(MIXES.externalPlasterMix.options),
    includeLabour: z.boolean(),
    labourRatePerSqftPaisa: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    const values = v as unknown as Record<string, number | null>;
    for (const n of NUMBERS) {
      const value = values[n.key] ?? null;
      if (value === null) {
        if (!n.nullable)
          ctx.addIssue({
            code: "custom",
            path: [n.key],
            message: msg("validation.required", { label: label(n.key) }),
          });
        continue;
      }
      if (value < n.min || value > n.max) {
        ctx.addIssue({
          code: "custom",
          path: [n.key],
          message: msg("projects.v.range", { label: label(n.key), min: String(n.min), max: String(n.max) }),
        });
      }
    }
    if (v.labourRatePerSqftPaisa !== null && !/^\d{1,12}$/.test(v.labourRatePerSqftPaisa)) {
      ctx.addIssue({
        code: "custom",
        path: ["labourRatePerSqftPaisa"],
        message: msg("validation.validAmount"),
      });
    }
  });

type Values = EstimateSettings;

const TABS: Tab[] = ["walls", "rcc", "plaster", "foundation", "factors"];
const FORM_ID = "estimate-settings-form";

/** Estimate assumptions with their Pakistani defaults, units and a reset. Read-only without projects.estimate.manage. */
export function EstimateSettingsModal({
  projectId,
  estimate,
  canManage,
  locked,
  onClose,
}: {
  projectId: string;
  estimate: ProjectEstimate;
  canManage: boolean;
  locked: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const run = useMutationToast();
  const [save, { isLoading }] = useUpdateEstimateSettingsMutation();
  const [tab, setTab] = useState<Tab>("walls");
  const editable = canManage && !locked;
  const defaults = estimate.defaults;
  const form = useForm<Values>({
    resolver: zodResolver(schema) as never,
    defaultValues: estimate.settings,
    mode: "onBlur",
  });
  const watched = useWatch({ control: form.control }) as Partial<Values>;
  const changed = (Object.keys(defaults) as Array<keyof Values>).filter(
    (k) => watched[k] !== undefined && watched[k] !== defaults[k],
  ).length;
  const errors = form.formState.errors as Record<string, unknown>;
  const tabHasError = (tb: Tab) =>
    NUMBERS.some((n) => n.tab === tb && errors[n.key]) ||
    (Object.keys(MIXES) as MixKey[]).some((m) => MIXES[m].tab === tb && errors[m]) ||
    (tb === "factors" && Boolean(errors["labourRatePerSqftPaisa"]));

  const unit = (u: UnitKey) => t(`projects.estimate.settings.unit.${u}` as TranslationKey);
  const defaultHint = (key: keyof Values, u?: UnitKey) => {
    const d = defaults[key];
    if (d === null) return undefined;
    const value = typeof d === "number" ? `${fmt(d)}${u ? ` ${unit(u)}` : ""}` : String(d);
    return t("projects.estimate.settings.defaultValue", { value });
  };

  const onSubmit = async (v: Values) => {
    const ok = await run(() => save({ projectId, body: v }).unwrap(), {
      success: t("projects.estimate.settings.saved"),
      setError: form.setError,
    });
    if (ok) onClose();
  };
  const reset = async () => {
    const result = await run(() => save({ projectId, body: {} }).unwrap(), {
      success: t("projects.estimate.settings.resetDone"),
    });
    if (result) form.reset(result.settings);
  };

  const numberField = (n: NumSpec) => {
    const hints = [
      n.hint ? t(n.hint) : null,
      n.key === "foundationWallLengthFt"
        ? t("projects.estimate.settings.foundationAuto", { n: fmt(estimate.basis.foundationWallLengthFt) })
        : defaultHint(n.key, n.unit),
    ].filter(Boolean);
    return (
      <NumberField
        key={n.key}
        name={n.key}
        label={t(label(n.key))}
        required={!n.nullable}
        unit={unit(n.unit)}
        decimals={n.decimals ?? 2}
        hint={hints.join(" · ")}
        disabled={!editable}
      />
    );
  };
  const mixField = (key: MixKey) => (
    <SegmentedField
      key={key}
      name={key}
      label={t(label(key))}
      required
      disabled={!editable}
      hint={defaultHint(key)}
      options={MIXES[key].options.map((value) => ({ value, label: value }))}
    />
  );
  const tabFields = (tb: Tab) => [
    ...(Object.keys(MIXES) as MixKey[]).filter((m) => MIXES[m].tab === tb).map(mixField),
    ...NUMBERS.filter((n) => n.tab === tb).map(numberField),
  ];

  return (
    <WideModal
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("projects.estimate.settings.title")}
      description={t("projects.estimate.settings.description")}
      busy={isLoading}
      testId="estimate-settings"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="tabular text-sm text-muted-foreground">
            {t("projects.estimate.settings.changed", { n: changed })}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {editable ? t("common.cancel") : t("common.close")}
            </Button>
            {editable ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void reset()}
                  disabled={isLoading || estimate.customised.length === 0}
                >
                  <RotateCcw data-icon="inline-start" />
                  {t("projects.estimate.settings.reset")}
                </Button>
                <Button type="submit" form={FORM_ID} disabled={isLoading}>
                  {t("common.save")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      }
    >
      <Form
        form={form}
        onSubmit={onSubmit}
        onInvalid={() => setTab(TABS.find(tabHasError) ?? tab)}
        id={FORM_ID}
      >
        {!canManage ? (
          <InlineAlert tone="info">{t("projects.estimate.settings.readOnly")}</InlineAlert>
        ) : locked ? (
          <InlineAlert tone="info">{t("projects.estimate.settings.locked")}</InlineAlert>
        ) : null}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-5">
          <FormTabsList
            tabs={TABS.map((value) => ({
              value,
              label: t(`projects.estimate.settings.tab.${value}` as TranslationKey),
              error: tabHasError(value),
            }))}
          />
          {TABS.map((tb) => (
            <TabsContent key={tb} value={tb} forceMount className={TAB_CONTENT_CLASS}>
              <FieldGrid columns={3}>{tabFields(tb)}</FieldGrid>
              {tb === "factors" ? (
                <FieldGrid columns={2}>
                  <ToggleField
                    name="includeLabour"
                    label={t(label("includeLabour"))}
                    description={t("projects.estimate.settings.f.includeLabourHint")}
                    disabled={!editable}
                  />
                  <MoneyField
                    name="labourRatePerSqftPaisa"
                    label={t(label("labourRatePerSqftPaisa"))}
                    hint={t("projects.estimate.settings.labourRateHint")}
                    suffix={t("projects.unit.perSqft")}
                    disabled={!editable || !watched.includeLabour}
                    placeholder={formatPKR("0")}
                  />
                </FieldGrid>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </Form>
    </WideModal>
  );
}
