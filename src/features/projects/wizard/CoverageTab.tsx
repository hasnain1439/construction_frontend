"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { projectsApi, useUpdateCoverageMutation } from "@/api/services/projects.api";
import type { ProjectDetail } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid, Form } from "@/components/forms/Form";
import { NumberField } from "@/components/forms/NumberField";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { ToggleField } from "@/components/forms/ToggleField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { defaultBoundaryLengthFt, formatArea } from "../utils/calc";
import { coverageSchema } from "./schemas";
import { useReportForm, useWizard, WIZARD_FORM_ID } from "./WizardContext";

type Values = z.input<typeof coverageSchema>;
type Output = z.output<typeof coverageSchema>;

const toValues = (p: ProjectDetail | null): Values => ({
  coveredAreaSqft: p?.coverage?.coveredAreaSqft ?? null,
  semiCoveredSqft: p?.coverage?.semiCoveredSqft ?? 0,
  openAreaSqft: p?.coverage?.openAreaSqft ?? 0,
  boundaryWall: p?.coverage?.boundaryWall ?? false,
  boundaryLengthFt: p?.coverage?.boundaryLengthFt ?? defaultBoundaryLengthFt(p?.plot?.frontFt, p?.plot?.depthFt),
  boundaryHeightFt: p?.coverage?.boundaryHeightFt ?? 7,
  boundaryThickness: p?.coverage?.boundaryThickness ?? "IN_9",
  boundaryPlasterSides: p?.coverage?.boundaryPlasterSides === 1 ? "1" : "2",
});

/** Storeys that carry covered area (the mumty is a small stair room; the basement sits under the ground floor). */
const STOREYS = ["GROUND", "FIRST", "SECOND", "THIRD"];

/** 2 × (front + depth) − a 12 ft gate: the boundary wall around the plot (QA B-30). */
export const GATE_FT = 12;
export function boundaryLengthDefault(frontFt: number | null | undefined, depthFt: number | null | undefined): number | null {
  if (!frontFt || !depthFt) return null;
  return Math.max(0, Math.round((2 * (frontFt + depthFt) - GATE_FT) * 100) / 100);
}

/**
 * What fits on the plot (QA B-24): covered area is the total of every floor; what has to fit on the plot
 * is the ground footprint + porch (semi-covered) + open area. A warning when it is larger than the plot.
 */
export function plotFit(p: { coveredSqft: number | null; semiSqft: number | null; openSqft: number | null; plotSqft: number | null; storeys: number; groundFootprintSqft?: number | null }) {
  const footprint = p.groundFootprintSqft ?? (p.coveredSqft && p.storeys > 0 ? Math.round((p.coveredSqft / p.storeys) * 100) / 100 : 0);
  const onPlot = Math.round((footprint + (p.semiSqft ?? 0) + (p.openSqft ?? 0)) * 100) / 100;
  return { footprint, onPlot, overflow: p.plotSqft !== null && p.plotSqft > 0 && onPlot > p.plotSqft };
}

/** Covered (all floors) and what stands on the plot vs the plot area. */
function SplitBar({ project }: { project: ProjectDetail | null }) {
  const [covered, semi, open] = useWatch({ name: ["coveredAreaSqft", "semiCoveredSqft", "openAreaSqft"] }) as [number | null, number | null, number | null];
  const t = useT();
  const cached = projectsApi.endpoints.getEstimate.useQueryState(project?.id ?? "", { skip: !project });
  const plotSqft = project?.calculations?.plotAreaSqft ?? null;
  const storeys = Math.max(1, (project?.floors ?? []).filter((f) => STOREYS.includes(f.level)).length);
  const ground = cached.data?.basis.floors.find((f) => f.level === "GROUND")?.footprintSqft ?? null;
  const fit = plotFit({ coveredSqft: covered, semiSqft: semi, openSqft: open, plotSqft, storeys, groundFootprintSqft: ground || null });
  const parts = [
    { label: t("projects.coverage.groundFootprint"), value: fit.footprint, className: "bg-primary" },
    { label: t("projects.section.semiCovered"), value: semi ?? 0, className: "bg-amber" },
    { label: t("projects.section.open"), value: open ?? 0, className: "bg-success" },
  ];
  const scale = Math.max(fit.onPlot, plotSqft ?? 0);
  if (!scale && !covered) return null;
  return (
    <div className="space-y-2" aria-label={t("projects.coverage.areaSplit")} data-testid="coverage-fit">
      <p className="text-sm">
        {t("projects.coverage.coveredAllFloors", { area: formatArea(covered ?? 0), floors: storeys })}
      </p>
      {scale ? (
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {parts.map((p) => (p.value ? <div key={p.label} className={p.className} style={{ width: `${Math.min(100, (p.value / scale) * 100)}%` }} /> : null))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${p.className}`} aria-hidden />
            {t("projects.coverage.splitItem", { label: p.label, area: formatArea(p.value) })}
          </span>
        ))}
        <span className="font-medium text-foreground">
          {plotSqft
            ? t("projects.coverage.onPlotOf", { area: formatArea(fit.onPlot), plot: formatArea(plotSqft) })
            : t("projects.coverage.onPlot", { area: formatArea(fit.onPlot) })}
        </span>
      </div>
      {fit.overflow && plotSqft ? (
        <InlineAlert tone="warning">
          <span data-testid="coverage-overflow">{t("projects.coverage.overflow", { area: formatArea(fit.onPlot), plot: formatArea(plotSqft) })}</span>
        </InlineAlert>
      ) : null}
    </div>
  );
}

function BoundaryFields({ disabled, project }: { disabled: boolean; project: ProjectDetail | null }) {
  const on = useWatch({ name: "boundaryWall" }) as boolean;
  const { getValues, setValue } = useFormContext();
  const t = useT();
  const suggested = boundaryLengthDefault(project?.plot?.frontFt, project?.plot?.depthFt);
  // QA B-30: an empty length starts as 2 × (front + depth) − 12 ft gate
  useEffect(() => {
    if (on && suggested && getValues("boundaryLengthFt") === null) setValue("boundaryLengthFt", suggested, { shouldDirty: true });
  }, [on, suggested, getValues, setValue]);
  if (!on) return null;
  return (
    <FieldGrid>
      <NumberField
        name="boundaryLengthFt"
        label={t("projects.coverage.length")}
        required
        min={1}
        unit={t("projects.unit.runningFt")}
        hint={suggested ? t("projects.coverage.lengthHint", { n: formatArea(suggested), gate: GATE_FT }) : undefined}
        disabled={disabled}
      />
      <NumberField name="boundaryHeightFt" label={t("projects.coverage.height")} required min={1} max={30} unit={t("projects.unit.ft")} disabled={disabled} />
      <SegmentedField
        name="boundaryThickness"
        label={t("projects.coverage.thickness")}
        required
        disabled={disabled}
        options={[
          { value: "IN_4_5", label: '4.5"' },
          { value: "IN_9", label: '9"' },
        ]}
      />
      <SegmentedField
        name="boundaryPlasterSides"
        label={t("projects.coverage.plaster")}
        required
        disabled={disabled}
        options={[
          { value: "1", label: t("projects.coverage.oneSide") },
          { value: "2", label: t("projects.coverage.bothSides") },
        ]}
      />
    </FieldGrid>
  );
}

/** Tab 4 — PATCH /projects/:id/coverage. */
export function CoverageTab() {
  const { projectId, project, locked, onSaved } = useWizard();
  const [save] = useUpdateCoverageMutation();
  const run = useMutationToast();
  const t = useT();
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(coverageSchema), values: toValues(project) });
  useReportForm(form);
  if (!projectId) return null;

  const onSubmit = async (v: Output) => {
    const saved = await run(
      () =>
        save({
          id: projectId,
          body: {
            coveredAreaSqft: v.coveredAreaSqft,
            semiCoveredSqft: v.semiCoveredSqft ?? 0,
            openAreaSqft: v.openAreaSqft ?? 0,
            boundaryWall: v.boundaryWall,
            ...(v.boundaryWall
              ? {
                  boundaryLengthFt: v.boundaryLengthFt as number,
                  boundaryHeightFt: v.boundaryHeightFt as number,
                  boundaryThickness: v.boundaryThickness as "IN_4_5" | "IN_9",
                  boundaryPlasterSides: Number(v.boundaryPlasterSides) as 1 | 2,
                }
              : {}),
          },
        }).unwrap(),
      { setError: form.setError },
    );
    if (saved) {
      form.reset(toValues(saved));
      onSaved(saved);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} id={WIZARD_FORM_ID}>
      <SectionCard title={t("projects.coverage.coverage")} description={t("projects.coverage.coverageDesc")}>
        <div className="space-y-4">
          <FieldGrid columns={3}>
            <NumberField name="coveredAreaSqft" label={t("projects.coverage.coveredArea")} required unit={t("projects.unit.sqft")} disabled={locked} />
            <NumberField name="semiCoveredSqft" label={t("projects.coverage.semiCovered")} min={0} unit={t("projects.unit.sqft")} disabled={locked} />
            <NumberField name="openAreaSqft" label={t("projects.coverage.openArea")} min={0} unit={t("projects.unit.sqft")} disabled={locked} />
          </FieldGrid>
          <SplitBar project={project} />
        </div>
      </SectionCard>
      <SectionCard title={t("projects.section.boundaryWall")}>
        <div className="space-y-4">
          <ToggleField name="boundaryWall" label={t("projects.section.boundaryWall")} description={t("projects.coverage.boundaryWallDesc")} disabled={locked} />
          <BoundaryFields disabled={locked} project={project} />
        </div>
      </SectionCard>
    </Form>
  );
}
