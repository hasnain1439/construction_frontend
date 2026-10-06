"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useUpdateCompanySettingsMutation } from "@/api/services/company.api";
import type { CompanySettings } from "@/api/types";
import { SectionCard } from "@/components/common/SectionCard";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { LANGUAGE_LABEL } from "@/lib/options";
import { companySettingsSchema } from "../schemas";

type Values = z.input<typeof companySettingsSchema>;

const defaults = (s: CompanySettings): Values => ({
  kharchaApprovalLimitPaisa: s.kharchaApprovalLimitPaisa,
  overuseAlertPercent: s.overuseAlertPercent,
  missingLogAlertTime: s.missingLogAlertTime,
  quoteValidityDays: s.quoteValidityDays,
  taxEnabled: s.taxEnabled,
  taxRatePercent: s.taxRatePercent,
  taxLabel: s.taxLabel ?? "",
  paymentTermsDays: s.paymentTermsDays,
  pmCanRecordPayments: s.pmCanRecordPayments,
  pmCanSeeFinancials: s.pmCanSeeFinancials,
  defaultLanguage: s.defaultLanguage,
});

/** One setting per card, with plain-language help. */
function SettingCard({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return (
    <SectionCard>
      <div className="grid gap-4 md:grid-cols-[1fr_280px] md:items-center">
        <div className="space-y-1">
          <p className="text-base font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{help}</p>
        </div>
        <div>{children}</div>
      </div>
    </SectionCard>
  );
}

export function CompanySettingsForm({ settings }: { settings: CompanySettings }) {
  const readOnly = useReadOnly();
  const [update, { isLoading }] = useUpdateCompanySettingsMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof companySettingsSchema>>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: defaults(settings),
  });

  const onSubmit = async (values: z.output<typeof companySettingsSchema>) => {
    const result = await run(() => update({ ...values, taxLabel: values.taxLabel || null }).unwrap(), { success: "Settings saved", setError: form.setError });
    if (result) form.reset(defaults(result));
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4">
      <SettingCard
        title="Site kharcha approval limit"
        help="Site expenses above this amount need your approval before they count."
      >
        <MoneyField name="kharchaApprovalLimitPaisa" label="Approval limit" hideLabel required />
      </SettingCard>
      <SettingCard
        title="Material overuse alert"
        help="Warn when a site uses more material than the estimate by this percentage (1–20 %)."
      >
        <NumberField name="overuseAlertPercent" label="Overuse alert" hideLabel unit="%" decimals={0} required />
      </SettingCard>
      <SettingCard title="Missing daily log alert" help="If no daily log is entered by this time, the PM and you get a reminder.">
        <TextField name="missingLogAlertTime" label="Alert time" hideLabel type="time" required />
      </SettingCard>
      <SettingCard title="Quote validity" help="How many days a quotation stays valid by default (1–90).">
        <NumberField name="quoteValidityDays" label="Quote validity" hideLabel unit="days" decimals={0} required />
      </SettingCard>
      <SettingCard title="Payment terms" help="An invoice is due this many days after it is issued (0–90).">
        <NumberField name="paymentTermsDays" label="Payment terms" hideLabel unit="days" decimals={0} required />
      </SettingCard>
      <SettingCard title="Tax rate on invoices" help="Used only when tax is switched on below, e.g. 16 % PRA or 15 % SRB.">
        <div className="grid grid-cols-2 gap-2">
          <NumberField name="taxRatePercent" label="Tax rate" hideLabel unit="%" decimals={2} required />
          <TextField name="taxLabel" label="Tax name" hideLabel placeholder="PRA" />
        </div>
      </SettingCard>
      <SettingCard title="Default language" help="Language for SMS and new team members.">
        <SelectField
          name="defaultLanguage"
          label="Default language"
          hideLabel
          options={Object.entries(LANGUAGE_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </SettingCard>
      <ToggleField
        name="pmCanSeeFinancials"
        label="New PMs can see financials"
        description="Default for new PM invitations: contract value, billing and profit. You can change it per person."
      />
      <ToggleField
        name="pmCanRecordPayments"
        label="PMs can record owner payments"
        description="Project managers who see financials may record payments received from owners (only you mark cheques cleared / bounced)."
      />
      <ToggleField
        name="taxEnabled"
        label="Tax on invoices"
        description="Off by default. When on, invoices and quotes will include tax (used by the billing module)."
      />
      <FormActions
        submitLabel="Save settings"
        loading={isLoading}
        disabled={readOnly || !form.formState.isDirty}
        onCancel={form.formState.isDirty ? () => form.reset() : undefined}
      />
    </Form>
  );
}
