"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useUpdateCoverageMutation } from "@/api/services/projects.api";
import type { ProjectDetail } from "@/api/types";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid, Form } from "@/components/forms/Form";
import { NumberField } from "@/components/forms/NumberField";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { ToggleField } from "@/components/forms/ToggleField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { formatArea } from "../utils/calc";
import { coverageSchema } from "./schemas";
import { useReportForm, useWizard, WIZARD_FORM_ID } from "./WizardContext";

type Values = z.input<typeof coverageSchema>;
type Output = z.output<typeof coverageSchema>;

const toValues = (p: ProjectDetail | null): Values => ({
  coveredAreaSqft: p?.coverage?.coveredAreaSqft ?? null,
  semiCoveredSqft: p?.coverage?.semiCoveredSqft ?? 0,
  openAreaSqft: p?.coverage?.openAreaSqft ?? 0,
  boundaryWall: p?.coverage?.boundaryWall ?? false,
  boundaryLengthFt: p?.coverage?.boundaryLengthFt ?? null,
  boundaryHeightFt: p?.coverage?.boundaryHeightFt ?? 7,
  boundaryThickness: p?.coverage?.boundaryThickness ?? "IN_9",
  boundaryPlasterSides: p?.coverage?.boundaryPlasterSides === 1 ? "1" : "2",
});

/** Covered / semi-covered / open as one proportional bar. */
function SplitBar() {
  const [covered, semi, open] = useWatch({ name: ["coveredAreaSqft", "semiCoveredSqft", "openAreaSqft"] }) as [number | null, number | null, number | null];
  const t = useT();
  const parts = [
    { label: t("projects.section.covered"), value: covered ?? 0, className: "bg-primary" },
    { label: t("projects.section.semiCovered"), value: semi ?? 0, className: "bg-amber" },
    { label: t("projects.section.open"), value: open ?? 0, className: "bg-success" },
  ];
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return null;
  return (
    <div className="space-y-2" aria-label={t("projects.coverage.areaSplit")}>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (p.value ? <div key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} /> : null))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${p.className}`} aria-hidden />
            {t("projects.coverage.splitItem", { label: p.label, area: formatArea(p.value) })}
          </span>
        ))}
        <span className="font-medium text-foreground">{t("projects.coverage.total", { area: formatArea(total) })}</span>
      </div>
    </div>
  );
}

function BoundaryFields({ disabled }: { disabled: boolean }) {
  const on = useWatch({ name: "boundaryWall" }) as boolean;
  const t = useT();
  if (!on) return null;
  return (
    <FieldGrid>
      <NumberField name="boundaryLengthFt" label={t("projects.coverage.length")} required unit={t("projects.unit.runningFt")} disabled={disabled} />
      <NumberField name="boundaryHeightFt" label={t("projects.coverage.height")} required unit={t("projects.unit.ft")} disabled={disabled} />
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
            <NumberField name="semiCoveredSqft" label={t("projects.coverage.semiCovered")} unit={t("projects.unit.sqft")} disabled={locked} />
            <NumberField name="openAreaSqft" label={t("projects.coverage.openArea")} unit={t("projects.unit.sqft")} disabled={locked} />
          </FieldGrid>
          <SplitBar />
        </div>
      </SectionCard>
      <SectionCard title={t("projects.section.boundaryWall")}>
        <div className="space-y-4">
          <ToggleField name="boundaryWall" label={t("projects.section.boundaryWall")} description={t("projects.coverage.boundaryWallDesc")} disabled={locked} />
          <BoundaryFields disabled={locked} />
        </div>
      </SectionCard>
    </Form>
  );
}
