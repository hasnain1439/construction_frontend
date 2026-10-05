"use client";

import { useMemo } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { useGetLaborRatesQuery, useUpdateLaborRatesMutation } from "@/api/services/masterData.api";
import type { LaborRate } from "@/api/types";
import { ErrorState } from "@/components/common/ErrorState";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { NumberInput } from "@/components/forms/NumberField";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatPKR } from "@/lib/money";
import { LABOR_UNIT_LABEL } from "@/lib/options";

interface RateValues {
  rates: Array<{ id: string; ratePaisa: string | null; overtimeMultiplier: number | null }>;
}

function RatesTable({
  title,
  description,
  rows,
  indexOf,
  editable,
  daily,
}: {
  title: string;
  description: string;
  rows: LaborRate[];
  indexOf: (id: string) => number;
  editable: boolean;
  daily: boolean;
}) {
  return (
    <SectionCard title={title} description={description} flush>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="px-4 text-xs font-semibold text-muted-foreground uppercase">Work</TableHead>
            <TableHead className="px-4 text-xs font-semibold text-muted-foreground uppercase">Unit</TableHead>
            <TableHead className="w-56 px-4 text-right text-xs font-semibold text-muted-foreground uppercase">Rate</TableHead>
            {daily ? <TableHead className="w-40 px-4 text-right text-xs font-semibold text-muted-foreground uppercase">Overtime ×</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((rate) => {
            const index = indexOf(rate.id);
            return (
              <TableRow key={rate.id}>
                <TableCell className="px-4 py-3 font-medium">{rate.label}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{LABOR_UNIT_LABEL[rate.unit] ?? rate.unit}</TableCell>
                <TableCell className="px-4 py-2 text-right">
                  {editable ? (
                    <Controller
                      name={`rates.${index}.ratePaisa`}
                      render={({ field, fieldState }) => (
                        <MoneyInput
                          aria-label={`${rate.label} rate`}
                          value={field.value as string | null}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={Boolean(fieldState.error) || undefined}
                        />
                      )}
                    />
                  ) : (
                    <span className="tabular">{formatPKR(rate.ratePaisa)}</span>
                  )}
                </TableCell>
                {daily ? (
                  <TableCell className="px-4 py-2 text-right">
                    {editable ? (
                      <Controller
                        name={`rates.${index}.overtimeMultiplier`}
                        render={({ field }) => (
                          <NumberInput
                            aria-label={`${rate.label} overtime multiplier`}
                            value={field.value as number | null}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            unit="×"
                            decimals={2}
                          />
                        )}
                      />
                    ) : (
                      <span className="tabular">{rate.overtimeMultiplier ? `${rate.overtimeMultiplier}×` : "—"}</span>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SectionCard>
  );
}

function SaveBar({ saving, onReset }: { saving: boolean; onReset: () => void }) {
  const { isDirty } = useFormState<RateValues>();
  return (
    <FormActions submitLabel="Save rates" loading={saving} disabled={!isDirty} onCancel={isDirty ? onReset : undefined} cancelLabel="Discard" />
  );
}

export function LaborRatesView() {
  const readOnly = useReadOnly();
  const editable = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const { data, isLoading, error, refetch } = useGetLaborRatesQuery();
  const [save, { isLoading: saving }] = useUpdateLaborRatesMutation();
  const run = useMutationToast();
  const values = useMemo<RateValues>(
    () => ({ rates: (data ?? []).map((r) => ({ id: r.id, ratePaisa: r.ratePaisa, overtimeMultiplier: r.overtimeMultiplier })) }),
    [data],
  );
  const form = useForm<RateValues>({ values });

  const onSubmit = async (submitted: RateValues) => {
    if (!data) return;
    const invalid = submitted.rates.findIndex((r) => !r.ratePaisa);
    if (invalid !== -1) {
      form.setError(`rates.${invalid}.ratePaisa`, { type: "required", message: "Enter a rate" });
      return;
    }
    const changed = submitted.rates
      .map((r, i) => ({ r, original: data[i] }))
      .filter(({ r, original }) => r.ratePaisa !== original.ratePaisa || r.overtimeMultiplier !== original.overtimeMultiplier)
      .map(({ r, original }) => ({
        kind: original.kind,
        key: original.key,
        label: original.label,
        unit: original.unit,
        ratePaisa: r.ratePaisa as string,
        ...(original.kind === "DAILY" ? { overtimeMultiplier: r.overtimeMultiplier } : {}),
      }));
    if (!changed.length) return;
    await run(() => save({ rates: changed }).unwrap(), { success: `${changed.length} rate${changed.length === 1 ? "" : "s"} saved` });
  };

  const indexOf = (id: string) => (data ?? []).findIndex((r) => r.id === id);
  const daily = (data ?? []).filter((r) => r.kind === "DAILY");
  const subcontract = (data ?? []).filter((r) => r.kind === "SUBCONTRACT");

  return (
    <>
      <PageHeader
        title="Labor Rates"
        description="Default wages for hazri and piece rates for sub-contract work. New workers start with these."
        breadcrumbs={[{ label: "Settings" }, { label: "Labor Rates" }]}
      />
      {isLoading ? (
        <TableSkeleton />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <Form form={form} onSubmit={onSubmit} className="space-y-6">
            <RatesTable title="Daily wages (hazri)" description="Per day. Overtime is paid at the multiplier." rows={daily} indexOf={indexOf} editable={editable} daily />
            <RatesTable title="Sub-contract piece rates" description="Paid per unit of work measured." rows={subcontract} indexOf={indexOf} editable={editable} daily={false} />
            {editable ? <SaveBar saving={saving} onReset={() => form.reset(values)} /> : null}
        </Form>
      )}
    </>
  );
}

