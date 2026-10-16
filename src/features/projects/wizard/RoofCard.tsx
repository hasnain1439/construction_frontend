"use client";

import { Lightbulb } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import type { FloorLevel, RoofType, SlabSuggestion, StructureType } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid } from "@/components/forms/Form";
import { NumberField } from "@/components/forms/NumberField";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { ToggleField } from "@/components/forms/ToggleField";
import { useEnumT, useT, type TranslationKey } from "@/i18n/useT";
import {
  BAR_MM,
  BAR_NUMBERS,
  ROOF_INFILLS,
  ROOF_MIXES,
  ROOF_TYPES,
  roofWarnings,
  STEEL_GRADES,
  suggestSlab,
  T_IRON_SECTIONS,
  toppingDefault,
  type RoofFormValues,
} from "../utils/roof";

function SubHeading({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{children}</h3>;
}

/**
 * Wizard tab 3 — "Roof / Lenter" card of one floor (`floors.<index>.roof.*` in the plot & structure
 * form). Off = not entered (the estimate uses the slab % from the assumptions). Fields appear by roof
 * type; beams and columns only for an RCC frame. The thickness suggestion comes from the floor's
 * largest room span (`slabSuggestion` from the API); the warnings mirror the API's soft checks.
 */
export function RoofCard({
  index,
  level,
  suggestion,
  structure,
  disabled,
}: {
  index: number;
  level: FloorLevel;
  suggestion?: SlabSuggestion;
  structure: StructureType | null;
  disabled: boolean;
}) {
  const t = useT();
  const te = useEnumT();
  const { setValue, getValues } = useFormContext();
  const base = `floors.${index}.roof`;
  const roof = useWatch({ name: base }) as RoofFormValues | undefined;
  if (!roof) return null;
  const inch = t("projects.foundation.inch");
  const ft = t("projects.unit.ft");
  const sqft = t("projects.unit.sqft");
  const s = suggestion ?? suggestSlab(null);
  const warnings = roofWarnings(roof, s);
  const barOptions = BAR_NUMBERS.map((b) => ({ value: String(b), label: t("projects.foundation.barValue", { bar: `#${b}`, mm: BAR_MM[b] }) }));
  const floorName = te("projectFloorLevel", level);
  const field = (k: keyof RoofFormValues) => `${base}.${k}`;

  const onTypeChange = (next: string | null) => {
    if (!next) return;
    // A topping that was the other type's default follows the new type
    const current = getValues(field("toppingIn")) as number | null;
    if (current === null || current === 2 || current === 4) setValue(field("toppingIn"), toppingDefault(next as RoofType), { shouldDirty: true });
  };

  return (
    <SectionCard
      title={t("projects.roof.title", { floor: floorName })}
      description={t("projects.roof.description")}
    >
      <div className="space-y-6" data-testid={`roof-card-${level}`}>
        <ToggleField name={field("enabled")} label={t("projects.roof.enabled")} description={t("projects.roof.enabledDesc")} disabled={disabled} />
        {roof.enabled ? (
          <>
            <FieldGrid columns={3}>
              <SelectField
                name={field("type")}
                label={t("projects.roof.type")}
                required
                disabled={disabled}
                onValueChange={onTypeChange}
                options={ROOF_TYPES.map((value) => ({ value, label: te("projectRoofType", value) }))}
                hint={t(`projects.roof.typeDesc.${roof.type}` as TranslationKey)}
              />
              <SegmentedField name={field("concreteMix")} label={t("projects.roof.concreteMix")} required disabled={disabled} options={ROOF_MIXES.map((value) => ({ value, label: value }))} />
              <SegmentedField
                name={field("steelGrade")}
                label={t("projects.roof.steelGrade")}
                required
                disabled={disabled}
                options={STEEL_GRADES.map((value) => ({ value, label: te("projectSteelGrade", value) }))}
              />
            </FieldGrid>

            {roof.type === "RCC_SLAB" ? (
              <div className="space-y-3">
                <SubHeading>{t("projects.roof.slab")}</SubHeading>
                <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="roof-suggestion">
                  <Lightbulb className="size-4 text-primary" aria-hidden />
                  {s.spanFt !== null
                    ? t(s.minIn < s.suggestedIn ? "projects.roof.suggestRange" : "projects.roof.suggest", { min: s.minIn, n: s.suggestedIn, span: s.spanFt })
                    : t("projects.roof.suggestNoRooms", { n: s.suggestedIn })}
                </p>
                <FieldGrid columns={3}>
                  <NumberField name={field("thicknessIn")} label={t("projects.roof.thickness")} required unit={inch} disabled={disabled} />
                  <SelectField name={field("mainBar")} label={t("projects.roof.mainBar")} required disabled={disabled} options={barOptions} />
                  <NumberField name={field("mainSpacingIn")} label={t("projects.roof.mainSpacing")} required unit={inch} disabled={disabled} />
                </FieldGrid>
                <FieldGrid columns={3}>
                  <NumberField name={field("coverIn")} label={t("projects.roof.cover")} unit={inch} disabled={disabled} />
                  <SelectField name={field("distBar")} label={t("projects.roof.distBar")} required disabled={disabled} options={barOptions} />
                  <NumberField name={field("distSpacingIn")} label={t("projects.roof.distSpacing")} required unit={inch} disabled={disabled} />
                </FieldGrid>
                <FieldGrid columns={3}>
                  <ToggleField name={field("topBars")} label={t("projects.roof.topBars")} description={t("projects.roof.topBarsDesc")} disabled={disabled} />
                  <NumberField name={field("chajjaLengthFt")} label={t("projects.roof.chajjaLength")} hint={t("projects.roof.chajjaHint")} unit={ft} disabled={disabled} />
                  {roof.chajjaLengthFt ? <NumberField name={field("chajjaWidthFt")} label={t("projects.roof.chajjaWidth")} unit={ft} disabled={disabled} /> : null}
                </FieldGrid>
                {warnings.length ? (
                  <InlineAlert tone="warning">
                    <ul className="list-disc space-y-1 ps-5" data-testid="roof-warnings">
                      {warnings.map((w) => (
                        <li key={w.code} data-code={w.code}>
                          {w.code === "TOO_THIN"
                            ? t("projects.roof.warn.tooThin", { n: roof.thicknessIn ?? 0, span: w.spanFt, suggested: w.suggestedIn })
                            : w.code === "NEEDS_BEAM"
                              ? t("projects.roof.warn.needsBeam", { span: w.spanFt })
                              : t(w.code === "MAIN_SPACING" ? "projects.roof.warn.mainSpacing" : "projects.roof.warn.distSpacing", { max: w.maxIn })}
                        </li>
                      ))}
                    </ul>
                  </InlineAlert>
                ) : null}
              </div>
            ) : null}

            {roof.type === "T_IRON_TILE" ? (
              <div className="space-y-3">
                <SubHeading>{t("projects.roof.tIron")}</SubHeading>
                <FieldGrid columns={3}>
                  <SelectField
                    name={field("tIronSection")}
                    label={t("projects.roof.tIronSection")}
                    required
                    disabled={disabled}
                    options={T_IRON_SECTIONS.map((value) => ({ value, label: te("projectTIronSection", value) }))}
                  />
                  <NumberField name={field("tIronSpacingFt")} label={t("projects.roof.tIronSpacing")} required unit={ft} disabled={disabled} />
                  <SegmentedField name={field("infill")} label={t("projects.roof.infill")} required disabled={disabled} options={ROOF_INFILLS.map((value) => ({ value, label: te("projectRoofInfill", value) }))} />
                  <NumberField name={field("screedThicknessIn")} label={t("projects.roof.screed")} unit={inch} disabled={disabled} />
                  <NumberField name={field("earthFillIn")} label={t("projects.roof.earthFill")} unit={inch} disabled={disabled} />
                </FieldGrid>
              </div>
            ) : null}

            {roof.type === "PRECAST" || roof.type === "STEEL_DECK" ? (
              <div className="space-y-3">
                <SubHeading>{t(roof.type === "PRECAST" ? "projects.roof.precast" : "projects.roof.deck")}</SubHeading>
                <FieldGrid columns={3}>
                  <NumberField
                    name={field(roof.type === "PRECAST" ? "plankAreaSqft" : "deckAreaSqft")}
                    label={t(roof.type === "PRECAST" ? "projects.roof.plankArea" : "projects.roof.deckArea")}
                    hint={t("projects.roof.areaHint")}
                    unit={sqft}
                    disabled={disabled}
                  />
                  <NumberField name={field("toppingIn")} label={t("projects.roof.topping")} placeholder={String(toppingDefault(roof.type))} unit={inch} disabled={disabled} />
                  <ToggleField name={field("mesh")} label={t("projects.roof.mesh")} description={t("projects.roof.meshDesc")} disabled={disabled} />
                </FieldGrid>
              </div>
            ) : null}

            {structure === "FRAMED" ? (
              <div className="space-y-3" data-testid="roof-frame">
                <SubHeading>{t("projects.roof.frame")}</SubHeading>
                <FieldGrid columns={3}>
                  <NumberField name={field("beamWidthIn")} label={t("projects.roof.beamWidth")} required unit={inch} disabled={disabled} />
                  <NumberField name={field("beamDepthIn")} label={t("projects.roof.beamDepth")} required unit={inch} disabled={disabled} />
                  <NumberField name={field("beamBars")} label={t("projects.roof.beamBars")} required decimals={0} disabled={disabled} />
                  <SelectField name={field("beamBar")} label={t("projects.roof.beamBar")} required disabled={disabled} options={barOptions} />
                  <SelectField name={field("stirrupBar")} label={t("projects.roof.stirrupBar")} required disabled={disabled} options={barOptions} />
                  <NumberField name={field("stirrupSpacingIn")} label={t("projects.roof.stirrupSpacing")} required unit={inch} disabled={disabled} />
                  <NumberField name={field("beamRunFt")} label={t("projects.roof.beamRun")} hint={t("projects.roof.beamRunHint")} unit={ft} disabled={disabled} />
                </FieldGrid>
                <FieldGrid columns={3}>
                  <NumberField name={field("columnCount")} label={t("projects.roof.columnCount")} hint={t("projects.roof.columnCountHint")} decimals={0} disabled={disabled} />
                  <NumberField name={field("columnWidthIn")} label={t("projects.roof.columnWidth")} required unit={inch} disabled={disabled} />
                  <NumberField name={field("columnDepthIn")} label={t("projects.roof.columnDepth")} required unit={inch} disabled={disabled} />
                  <NumberField name={field("columnBars")} label={t("projects.roof.columnBars")} required decimals={0} disabled={disabled} />
                  <SelectField name={field("columnBar")} label={t("projects.roof.columnBar")} required disabled={disabled} options={barOptions} />
                  <SelectField name={field("tieBar")} label={t("projects.roof.tieBar")} required disabled={disabled} options={barOptions} />
                  <NumberField name={field("tieSpacingIn")} label={t("projects.roof.tieSpacing")} required unit={inch} disabled={disabled} />
                </FieldGrid>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}
