"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Moon, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useUpdateCompanySettingsMutation } from "@/api/services/company.api";
import type { CompanySettings } from "@/api/types";
import { SectionCard } from "@/components/common/SectionCard";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { useFieldError } from "@/components/forms/FormField";
import { NumberField } from "@/components/forms/NumberField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";
import { ramadanSchema, type RamadanValues } from "../schemas";

const defaults = (s: CompanySettings): RamadanValues => ({
  ramadanDayFactor: s.ramadanDayFactor,
  builtIn: !s.ramadanPeriodsCustom,
  periods: s.ramadanPeriods.map((p) => ({ start: p.start, end: p.end })),
});

function PeriodsError() {
  const error = useFieldError("periods");
  return error ? <p className="text-xs font-medium text-destructive">{error}</p> : null;
}

/** Company settings → Ramadan day factor and Ramadan dates (the schedule's working calendar). */
export function RamadanSettingsCard({ settings }: { settings: CompanySettings }) {
  const t = useT();
  const readOnly = useReadOnly();
  const [update, { isLoading }] = useUpdateCompanySettingsMutation();
  const run = useMutationToast();
  const form = useForm<RamadanValues, unknown, RamadanValues>({
    resolver: zodResolver(ramadanSchema),
    defaultValues: defaults(settings),
  });
  const periods = useFieldArray({ control: form.control, name: "periods" });
  const builtIn = useWatch({ control: form.control, name: "builtIn" });

  const onSubmit = async (v: RamadanValues) => {
    const result = await run(
      () =>
        update({
          ramadanDayFactor: v.ramadanDayFactor ?? 0.75,
          ramadanPeriods: v.builtIn ? null : v.periods.map((p) => ({ start: p.start, end: p.end })),
        }).unwrap(),
      { success: t("schedule.ramadan.saved"), setError: form.setError },
    );
    if (result) form.reset(defaults(result));
  };

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <Moon className="size-4" aria-hidden />
          {t("schedule.ramadan.title")}
        </span>
      }
      description={t("schedule.ramadan.help")}
    >
      <Form form={form} onSubmit={onSubmit} className="space-y-4" id="ramadan-form">
        <NumberField
          name="ramadanDayFactor"
          label={t("schedule.ramadan.factor")}
          hint={t("schedule.ramadan.factorHint")}
          decimals={2}
          required
          className="max-w-xs"
        />
        <ToggleField
          name="builtIn"
          label={t("schedule.ramadan.builtIn")}
          description={t("schedule.ramadan.builtInHint")}
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("schedule.ramadan.periods")}</p>
          {periods.fields.map((field, i) => (
            <div key={field.id} className="flex flex-wrap items-end gap-3">
              <DateField
                name={`periods.${i}.start`}
                label={t("schedule.ramadan.start")}
                disabled={builtIn}
                className="w-44"
              />
              <DateField
                name={`periods.${i}.end`}
                label={t("schedule.ramadan.end")}
                disabled={builtIn}
                className="w-44"
              />
              {!builtIn ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => periods.remove(i)}
                  aria-label={t("schedule.ramadan.remove", { n: i + 1 })}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ))}
          <PeriodsError />
          {!builtIn ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => periods.append({ start: "", end: "" })}
            >
              <Plus data-icon="inline-start" />
              {t("schedule.ramadan.add")}
            </Button>
          ) : null}
        </div>
        <FormActions
          formId="ramadan-form"
          submitLabel={t("schedule.ramadan.save")}
          loading={isLoading}
          disabled={readOnly || !form.formState.isDirty}
          onCancel={form.formState.isDirty ? () => form.reset() : undefined}
        />
      </Form>
    </SectionCard>
  );
}
