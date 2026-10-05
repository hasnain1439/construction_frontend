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
  const parts = [
    { label: "Covered", value: covered ?? 0, className: "bg-primary" },
    { label: "Semi-covered", value: semi ?? 0, className: "bg-amber" },
    { label: "Open", value: open ?? 0, className: "bg-success" },
  ];
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return null;
  return (
    <div className="space-y-2" aria-label="Area split">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (p.value ? <div key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} /> : null))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${p.className}`} aria-hidden />
            {p.label} {formatArea(p.value)} sq ft
          </span>
        ))}
        <span className="font-medium text-foreground">Total {formatArea(total)} sq ft</span>
      </div>
    </div>
  );
}

function BoundaryFields({ disabled }: { disabled: boolean }) {
  const on = useWatch({ name: "boundaryWall" }) as boolean;
  if (!on) return null;
  return (
    <FieldGrid>
      <NumberField name="boundaryLengthFt" label="Length" required unit="running ft" disabled={disabled} />
      <NumberField name="boundaryHeightFt" label="Height" required unit="ft" disabled={disabled} />
      <SegmentedField
        name="boundaryThickness"
        label="Thickness"
        required
        disabled={disabled}
        options={[
          { value: "IN_4_5", label: '4.5"' },
          { value: "IN_9", label: '9"' },
        ]}
      />
      <SegmentedField
        name="boundaryPlasterSides"
        label="Plaster"
        required
        disabled={disabled}
        options={[
          { value: "1", label: "One side" },
          { value: "2", label: "Both sides" },
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
      <SectionCard title="Coverage" description="Covered area drives labour-only totals and the room check on the Review tab.">
        <div className="space-y-4">
          <FieldGrid columns={3}>
            <NumberField name="coveredAreaSqft" label="Covered area" required unit="sq ft" disabled={locked} />
            <NumberField name="semiCoveredSqft" label="Semi-covered / car porch" unit="sq ft" disabled={locked} />
            <NumberField name="openAreaSqft" label="Open area" unit="sq ft" disabled={locked} />
          </FieldGrid>
          <SplitBar />
        </div>
      </SectionCard>
      <SectionCard title="Boundary wall">
        <div className="space-y-4">
          <ToggleField name="boundaryWall" label="Boundary wall" description="Build a boundary wall around the plot." disabled={locked} />
          <BoundaryFields disabled={locked} />
        </div>
      </SectionCard>
    </Form>
  );
}
