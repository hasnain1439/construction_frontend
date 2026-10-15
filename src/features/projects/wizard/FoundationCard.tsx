"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { FoundationMasonry, FoundationType } from "@/api/types";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid } from "@/components/forms/Form";
import { NumberField } from "@/components/forms/NumberField";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { type TranslationKey, useEnumT, useT } from "@/i18n/useT";
import {
  BAR_SIZES,
  DPC_MATERIALS,
  FOOTING_THICKNESS_DEFAULT,
  FOUNDATION_MASONRY,
  FOUNDATION_TYPES,
  hasPads,
  isPile,
  PCC_MIXES,
  RCC_MIXES,
  rccApplies,
  SOIL_TYPES,
} from "../utils/foundation";

const SUGGESTED_THICKNESS = new Set(Object.values(FOOTING_THICKNESS_DEFAULT));

function SubHeading({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{children}</h3>;
}

/**
 * Wizard tab 3 — "Foundation (Bunyaad)" card inside the plot & structure form (`foundation.*` fields).
 * Fields appear by type: strip width; pad count + L × W; pile count, diameter and depth; RCC mix and
 * main steel wherever RCC applies; the soil test note only when a test was done.
 */
export function FoundationCard({ disabled }: { disabled: boolean }) {
  const t = useT();
  const te = useEnumT();
  const { getValues, setValue } = useFormContext();
  const [type, masonry, soilTestDone] = useWatch({ name: ["foundation.type", "foundation.masonry", "foundation.soilTestDone"] }) as [
    FoundationType,
    FoundationMasonry,
    boolean,
  ];
  const ft = t("projects.unit.ft");
  const inch = t("projects.foundation.inch");

  // A new type brings its usual thickness, unless the user already typed their own.
  const onTypeChange = (next: string | null) => {
    if (!next) return;
    const current = getValues("foundation.footingThicknessIn") as number | null;
    if (current === null || SUGGESTED_THICKNESS.has(current)) {
      setValue("foundation.footingThicknessIn", FOOTING_THICKNESS_DEFAULT[next as FoundationType], { shouldDirty: true });
    }
  };

  return (
    <SectionCard title={t("projects.foundation.title")} description={t("projects.foundation.description")}>
      <div className="space-y-6" data-testid="foundation-card">
        <FieldGrid>
          <SelectField
            name="foundation.type"
            label={t("projects.foundation.type")}
            required
            disabled={disabled}
            onValueChange={onTypeChange}
            options={FOUNDATION_TYPES.map((value) => ({ value, label: te("projectFoundationType", value) }))}
            hint={type ? t(`projects.foundation.typeDesc.${type}` as TranslationKey) : undefined}
          />
        </FieldGrid>

        <div className="space-y-3">
          <SubHeading>{t("projects.foundation.dimensions")}</SubHeading>
          <FieldGrid columns={3}>
            <NumberField name="foundation.excavationDepthFt" label={t("projects.foundation.excavationDepth")} required unit={ft} disabled={disabled} />
            <NumberField name="foundation.footingThicknessIn" label={t("projects.foundation.footingThickness")} required unit={inch} disabled={disabled} />
            {type === "STRIP" ? (
              <NumberField name="foundation.footingWidthFt" label={t("projects.foundation.footingWidth")} required unit={ft} disabled={disabled} />
            ) : null}
            <NumberField name="foundation.plinthHeightFt" label={t("projects.foundation.plinthHeight")} required unit={ft} disabled={disabled} />
            <NumberField name="foundation.dpcThicknessIn" label={t("projects.foundation.dpcThickness")} required unit={inch} disabled={disabled} />
          </FieldGrid>
          {hasPads(type) ? (
            <FieldGrid columns={3}>
              <NumberField name="foundation.footingCount" label={t("projects.foundation.footingCount")} required decimals={0} disabled={disabled} />
              <NumberField name="foundation.footingLengthFt" label={t("projects.foundation.footingLength")} required unit={ft} disabled={disabled} />
              <NumberField name="foundation.footingWidthFt" label={t("projects.foundation.footingWidthPad")} required unit={ft} disabled={disabled} />
            </FieldGrid>
          ) : null}
          {isPile(type) ? (
            <FieldGrid columns={3}>
              <NumberField name="foundation.pileCount" label={t("projects.foundation.pileCount")} required decimals={0} disabled={disabled} />
              <NumberField name="foundation.pileDiameterIn" label={t("projects.foundation.pileDiameter")} required unit={inch} disabled={disabled} />
              <NumberField name="foundation.pileDepthFt" label={t("projects.foundation.pileDepth")} required unit={ft} disabled={disabled} />
            </FieldGrid>
          ) : null}
        </div>

        <div className="space-y-3">
          <SubHeading>{t("projects.foundation.material")}</SubHeading>
          <FieldGrid columns={3}>
            <SelectField
              name="foundation.masonry"
              label={t("projects.foundation.masonry")}
              required
              disabled={disabled}
              options={FOUNDATION_MASONRY.map((value) => ({ value, label: te("projectFoundationMasonry", value) }))}
            />
            <SegmentedField name="foundation.pccMix" label={t("projects.foundation.pccMix")} required disabled={disabled} options={PCC_MIXES.map((value) => ({ value, label: value }))} />
            <NumberField name="foundation.pccThicknessIn" label={t("projects.foundation.pccThickness")} required unit={inch} disabled={disabled} />
          </FieldGrid>
          {rccApplies(type, masonry) ? (
            <FieldGrid columns={3}>
              <SegmentedField name="foundation.rccMix" label={t("projects.foundation.rccMix")} required disabled={disabled} options={RCC_MIXES.map((value) => ({ value, label: value }))} />
              <SelectField
                name="foundation.mainBarMm"
                label={t("projects.foundation.mainBar")}
                required
                disabled={disabled}
                options={BAR_SIZES.map((b) => ({ value: String(b.mm), label: t("projects.foundation.barValue", { bar: b.bar, mm: b.mm }) }))}
              />
            </FieldGrid>
          ) : null}
          <FieldGrid>
            <SelectField
              name="foundation.dpcMaterial"
              label={t("projects.foundation.dpcMaterial")}
              required
              disabled={disabled}
              options={DPC_MATERIALS.map((value) => ({ value, label: te("projectDpcMaterial", value) }))}
            />
            <ToggleField name="foundation.termiteTreatment" label={t("projects.foundation.termite")} description={t("projects.foundation.termiteDesc")} disabled={disabled} className="self-end" />
          </FieldGrid>
        </div>

        <div className="space-y-3">
          <SubHeading>{t("projects.foundation.soilSite")}</SubHeading>
          <FieldGrid columns={3}>
            <SelectField
              name="foundation.soilType"
              label={t("projects.foundation.soilType")}
              disabled={disabled}
              noneLabel={t("projects.foundation.notEntered")}
              placeholder={t("projects.foundation.notEntered")}
              options={SOIL_TYPES.map((value) => ({ value, label: te("projectSoilType", value) }))}
            />
            <NumberField name="foundation.waterTableDepthFt" label={t("projects.foundation.waterTable")} hint={t("projects.foundation.waterTableHint")} unit={ft} disabled={disabled} />
            <ToggleField name="foundation.dewateringNeeded" label={t("projects.foundation.dewatering")} description={t("projects.foundation.dewateringDesc")} disabled={disabled} />
          </FieldGrid>
          <FieldGrid>
            <ToggleField name="foundation.soilTestDone" label={t("projects.foundation.soilTestDone")} description={t("projects.foundation.soilTestDesc")} disabled={disabled} />
            {soilTestDone ? (
              <TextField name="foundation.soilTestNote" label={t("projects.foundation.soilTestNote")} placeholder={t("projects.foundation.soilTestNoteHint")} maxLength={300} disabled={disabled} />
            ) : null}
          </FieldGrid>
          <TextareaField name="foundation.notes" label={t("projects.foundation.notes")} rows={2} maxLength={1000} disabled={disabled} />
        </div>
      </div>
    </SectionCard>
  );
}
