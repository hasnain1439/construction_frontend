"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, Plus, Ruler, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useUpdatePlotStructureMutation } from "@/api/services/projects.api";
import type { FloorLevel, ProjectDetail } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid, Form } from "@/components/forms/Form";
import { useFieldError } from "@/components/forms/FormField";
import { NumberField, NumberInput } from "@/components/forms/NumberField";
import { RadioCards } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { cn } from "@/lib/cn";
import { useMe } from "@/store/hooks";
import { DEFAULT_CEILING, FLOOR_LABEL, FLOOR_ORDER, PLOT_UNIT_LABEL, STRUCTURE_TYPES } from "../constants";
import { formatArea, plotCalc } from "../utils/calc";
import { plotStructureSchema } from "./schemas";
import { useReportForm, useWizard, WIZARD_FORM_ID } from "./WizardContext";

type Values = z.input<typeof plotStructureSchema>;
type Output = z.output<typeof plotStructureSchema>;

const ADDABLE: FloorLevel[] = ["FIRST", "SECOND", "THIRD", "MUMTY"];
const sortFloors = <T extends { level: FloorLevel }>(floors: T[]) =>
  [...floors].sort((a, b) => FLOOR_ORDER.indexOf(a.level) - FLOOR_ORDER.indexOf(b.level));

function toValues(p: ProjectDetail | null, companyMarla: number): Values {
  const floors = sortFloors(
    (p?.floors ?? []).map((f) => ({ level: f.level, ceilingHeightFt: f.ceilingHeightFt as number | null })),
  );
  return {
    plotUnit: p?.plot?.plotUnit ?? "MARLA",
    plotSize: p?.plot?.plotSize ?? null,
    marlaStandard: (p?.plot?.marlaStandard ?? companyMarla) === 272.25 ? "272.25" : "225",
    frontFt: p?.plot?.frontFt ?? null,
    depthFt: p?.plot?.depthFt ?? null,
    cornerPlot: p?.plot?.cornerPlot ?? false,
    structureType: p?.structure?.structureType ?? "FRAMED",
    hasBasement: p?.structure?.hasBasement ?? false,
    basementHeightFt: p?.structure?.basementHeightFt ?? null,
    floors: floors.length ? floors.filter((f) => f.level !== "BASEMENT") : [{ level: "GROUND", ceilingHeightFt: DEFAULT_CEILING.GROUND }],
  };
}

/** "10 Marla = 2,250 sq ft · 35 × 65 = 2,275 sq ft" with a warning when they disagree. */
function PlotResult() {
  const [plotUnit, plotSize, marlaStandard, frontFt, depthFt] = useWatch({
    name: ["plotUnit", "plotSize", "marlaStandard", "frontFt", "depthFt"],
  }) as [Values["plotUnit"], number | null, string, number | null, number | null];
  const calc = plotCalc({ plotUnit, plotSize, marlaStandard: Number(marlaStandard), frontFt, depthFt });
  return (
    <div className={cn("rounded-xl border p-4", calc.plotAreaMismatch ? "border-warning/40 bg-warning-soft" : "bg-info-soft")} aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Ruler className="size-4 text-primary" aria-hidden />
        {calc.plotAreaSqft !== null ? `${plotSize} ${PLOT_UNIT_LABEL[plotUnit]} = ${formatArea(calc.plotAreaSqft)} sq ft` : "Enter the plot size"}
        {calc.frontageAreaSqft !== null ? ` · ${frontFt} × ${depthFt} = ${formatArea(calc.frontageAreaSqft)} sq ft` : ""}
      </p>
      {calc.plotAreaMismatch ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert className="size-3.5" aria-hidden />
          These differ by more than 10 % — check the size or the measurements.
        </p>
      ) : null}
    </div>
  );
}

function FloorsBuilder({ disabled }: { disabled: boolean }) {
  const { control } = useFormContext<Values>();
  const { fields, append, remove } = useFieldArray({ control, name: "floors" });
  const floors = (useWatch({ control, name: "floors" }) as Values["floors"]) ?? [];
  const hasBasement = useWatch({ control, name: "hasBasement" }) as boolean;
  const error = useFieldError("floors");
  const next = ADDABLE.find((level) => !floors.some((f) => f.level === level));

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Floors<span className="text-destructive">*</span>
      </p>
      <ul className="space-y-2">
        {hasBasement ? (
          <li className="flex items-center gap-3 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
            <GripVertical className="size-4" aria-hidden />
            <span className="flex-1">Basement — height set above</span>
          </li>
        ) : null}
        {fields.map((field, index) => {
          const level = floors[index]?.level ?? (field as unknown as { level: FloorLevel }).level;
          return (
            <li key={field.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
              <GripVertical className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm font-medium">{FLOOR_LABEL[level]}</span>
              <Controller
                control={control}
                name={`floors.${index}.ceilingHeightFt`}
                render={({ field: f, fieldState }) => (
                  <NumberInput
                    aria-label={`${FLOOR_LABEL[level]} ceiling height`}
                    value={f.value as number | null}
                    onChange={f.onChange}
                    onBlur={f.onBlur}
                    unit="ft"
                    className="w-32"
                    disabled={disabled}
                    aria-invalid={Boolean(fieldState.error) || undefined}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled || level === "GROUND"}
                onClick={() => remove(index)}
                aria-label={`Remove ${FLOOR_LABEL[level]}`}
              >
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !next}
        onClick={() => next && append({ level: next, ceilingHeightFt: DEFAULT_CEILING[next] })}
      >
        <Plus data-icon="inline-start" />
        {next ? `Add ${FLOOR_LABEL[next].toLowerCase()}` : "All floors added"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BasementHeight({ disabled }: { disabled: boolean }) {
  const hasBasement = useWatch({ name: "hasBasement" }) as boolean;
  if (!hasBasement) return null;
  return <NumberField name="basementHeightFt" label="Basement height" required unit="ft" disabled={disabled} />;
}

/** Tab 3 — PATCH /projects/:id/plot-structure (floors upserted by level). */
export function PlotStructureTab() {
  const { projectId, project, locked, onSaved } = useWizard();
  const me = useMe();
  const [save] = useUpdatePlotStructureMutation();
  const run = useMutationToast();
  const [pendingForce, setPendingForce] = useState<Output | null>(null);
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(plotStructureSchema), values: toValues(project, me?.tenant.marlaStandard ?? 225) });
  useReportForm(form);

  if (!projectId) return null;

  const send = async (v: Output, force: boolean) => {
    const floors = sortFloors([
      ...(v.hasBasement ? [{ level: "BASEMENT" as const, ceilingHeightFt: v.basementHeightFt as number }] : []),
      ...v.floors.map((f) => ({ level: f.level, ceilingHeightFt: f.ceilingHeightFt })),
    ]);
    const saved = await run(
      () =>
        save({
          id: projectId,
          body: {
            plotUnit: v.plotUnit,
            plotSize: v.plotSize,
            marlaStandard: Number(v.marlaStandard) as 225 | 272.25,
            frontFt: v.frontFt,
            depthFt: v.depthFt,
            cornerPlot: v.cornerPlot,
            structureType: v.structureType,
            hasBasement: v.hasBasement,
            ...(v.hasBasement ? { basementHeightFt: v.basementHeightFt as number } : {}),
            floors,
            ...(force ? { force: true } : {}),
          },
        }).unwrap(),
      {
        setError: form.setError,
        onError: (code) => {
          if (code === "FLOOR_HAS_ROOMS") {
            setPendingForce(v);
            return true;
          }
          return false;
        },
      },
    );
    if (saved) {
      setPendingForce(null);
      form.reset(toValues(saved, me?.tenant.marlaStandard ?? 225));
      onSaved(saved);
    }
  };

  return (
    <>
      <Form form={form} onSubmit={(v) => send(v, false)} id={WIZARD_FORM_ID}>
        <SectionCard title="Plot">
          <div className="space-y-4">
            <FieldGrid columns={3}>
              <SelectField
                name="plotUnit"
                label="Plot unit"
                required
                disabled={locked}
                options={Object.entries(PLOT_UNIT_LABEL).map(([value, label]) => ({ value, label }))}
              />
              <NumberField name="plotSize" label="Plot size" required disabled={locked} />
              <SegmentedField
                name="marlaStandard"
                label="Marla standard"
                required
                disabled={locked}
                options={[
                  { value: "225", label: "225" },
                  { value: "272.25", label: "272.25" },
                ]}
              />
            </FieldGrid>
            <FieldGrid columns={3}>
              <NumberField name="frontFt" label="Front" required unit="ft" disabled={locked} />
              <NumberField name="depthFt" label="Depth" required unit="ft" disabled={locked} />
              <ToggleField name="cornerPlot" label="Corner plot" disabled={locked} className="self-end" />
            </FieldGrid>
            <PlotResult />
          </div>
        </SectionCard>
        <SectionCard title="Structure">
          <div className="space-y-5">
            <RadioCards name="structureType" label="Structure type" required options={STRUCTURE_TYPES} disabled={locked} />
            <FieldGrid>
              <ToggleField name="hasBasement" label="Basement" description="Adds a basement floor below ground." disabled={locked} />
              <BasementHeight disabled={locked} />
            </FieldGrid>
            <FloorsBuilder disabled={locked} />
          </div>
        </SectionCard>
      </Form>
      <ConfirmDialog
        open={pendingForce !== null}
        onOpenChange={(o) => !o && setPendingForce(null)}
        title="Remove floors that have rooms?"
        description="A floor you removed still has rooms. Saving deletes those rooms too."
        confirmLabel="Remove floors and rooms"
        onConfirm={() => (pendingForce ? send(pendingForce, true) : undefined)}
      />
    </>
  );
}
