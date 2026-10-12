"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useCreateWorkerTypeMutation, useUpdateWorkerTypeMutation } from "@/api/services/masterData.api";
import type { WorkerTypeRow } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { pickTypeName } from "@/lib/workerTypes";
import { createWorkerTypeSchema, type WorkerTypeFormSchema } from "../schemas";

type Values = z.input<WorkerTypeFormSchema>;
type Output = z.output<WorkerTypeFormSchema>;

const DEFAULT_OVERTIME = 1.5;

/** Add / edit a company worker type (names in three languages, daily rate, overtime, active). */
export function WorkerTypeSlideOver({
  open,
  workerType,
  onOpenChange,
}: {
  open: boolean;
  workerType: WorkerTypeRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const FORM_ID = "worker-type-form";
  const t = useT();
  const language = useLanguage();
  const schema = useMemo(() => createWorkerTypeSchema(t), [t]);
  const [create, { isLoading: creating }] = useCreateWorkerTypeMutation();
  const [update, { isLoading: updating }] = useUpdateWorkerTypeMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    values: {
      label: workerType?.label ?? "",
      labelRoman: workerType?.labelRoman ?? "",
      labelUrdu: workerType?.labelUrdu ?? "",
      ratePaisa: workerType?.ratePaisa ?? null,
      overtimeMultiplier: workerType ? workerType.overtimeMultiplier : DEFAULT_OVERTIME,
      isActive: workerType?.isActive ?? true,
    },
  });

  const onSubmit = async (v: Output) => {
    const options = { setError: form.setError, codeFields: { WORKER_TYPE_EXISTS: "label" } };
    const names = (row: { label: string; labelRoman: string | null; labelUrdu: string | null }) => pickTypeName(row, language);
    const result = workerType
      ? await run(
          () =>
            update({
              id: workerType.id,
              body: {
                label: v.label,
                labelRoman: v.labelRoman || null,
                labelUrdu: v.labelUrdu || null,
                ratePaisa: v.ratePaisa,
                overtimeMultiplier: v.overtimeMultiplier,
                ...(v.isActive !== workerType.isActive ? { isActive: v.isActive } : {}),
              },
            }).unwrap(),
          { ...options, success: (row) => t("workerTypes.saved", { name: names(row) }) },
        )
      : await run(
          () =>
            create({
              label: v.label,
              ...(v.labelRoman ? { labelRoman: v.labelRoman } : {}),
              ...(v.labelUrdu ? { labelUrdu: v.labelUrdu } : {}),
              ratePaisa: v.ratePaisa,
              overtimeMultiplier: v.overtimeMultiplier,
            }).unwrap(),
          { ...options, success: (row) => t("workerTypes.added", { name: names(row) }) },
        );
    if (result) onOpenChange(false);
  };

  const busy = creating || updating;
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={workerType ? t("workerTypes.editTitle", { name: pickTypeName(workerType, language) }) : t("workerTypes.addTitle")}
      description={t("workerTypes.formDesc")}
      busy={busy}
      footer={
        <FormActions
          formId={FORM_ID}
          submitLabel={workerType ? t("workerTypes.save") : t("workerTypes.add")}
          loading={busy}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="label" label={t("workerTypes.nameEn")} required placeholder="Electrician" maxLength={60} dir="ltr" />
        <FieldGrid>
          <TextField name="labelRoman" label={t("workerTypes.nameRoman")} placeholder="Bijli wala" maxLength={60} dir="ltr" />
          <TextField name="labelUrdu" label={t("workerTypes.nameUrdu")} placeholder="بجلی والا" maxLength={60} dir="rtl" />
        </FieldGrid>
        <p className="-mt-2 text-xs text-muted-foreground">{t("workerTypes.nameHint")}</p>
        <FieldGrid>
          <MoneyField name="ratePaisa" label={t("workerTypes.dailyRate")} required />
          <NumberField name="overtimeMultiplier" label={t("workerTypes.overtime")} required unit="×" decimals={2} hint={t("workerTypes.overtimeHint")} />
        </FieldGrid>
        {workerType ? <ToggleField name="isActive" label={t("workerTypes.activeLabel")} description={t("workerTypes.activeHint")} /> : null}
      </Form>
    </SlideOver>
  );
}
