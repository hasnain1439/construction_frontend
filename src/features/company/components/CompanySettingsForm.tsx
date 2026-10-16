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
import { useEnumT, useT } from "@/i18n/useT";
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
  defaultMarginPercent: s.defaultMarginPercent,
  defaultFinishingAllowancePercent: s.defaultFinishingAllowancePercent,
  pmCanSeeFinancials: s.pmCanSeeFinancials,
  defaultLanguage: s.defaultLanguage,
  behindPlanAlertPoints: s.behindPlanAlertPoints,
  lateFinishGraceDays: s.lateFinishGraceDays,
  quotaAlertPercent: s.quotaAlertPercent,
  spendAheadAlertPoints: s.spendAheadAlertPoints,
  controlAlertsEnabled: s.controlAlertsEnabled,
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

const LANGUAGES = ["ENGLISH", "ROMAN_URDU", "URDU"] as const;

export function CompanySettingsForm({ settings }: { settings: CompanySettings }) {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const [update, { isLoading }] = useUpdateCompanySettingsMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof companySettingsSchema>>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: defaults(settings),
  });

  const onSubmit = async (values: z.output<typeof companySettingsSchema>) => {
    const result = await run(() => update({ ...values, taxLabel: values.taxLabel || null }).unwrap(), { success: t("teamCompany.settings.saved"), setError: form.setError });
    if (result) form.reset(defaults(result));
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4">
      <SettingCard
        title={t("teamCompany.settings.kharchaTitle")}
        help={t("teamCompany.settings.kharchaHelp")}
      >
        <MoneyField name="kharchaApprovalLimitPaisa" label={t("teamCompany.settings.kharchaLabel")} hideLabel required />
      </SettingCard>
      <SettingCard
        title={t("teamCompany.settings.overuseTitle")}
        help={t("teamCompany.settings.overuseHelp")}
      >
        <NumberField name="overuseAlertPercent" label={t("teamCompany.settings.overuseLabel")} hideLabel unit="%" decimals={0} required />
      </SettingCard>
      <SettingCard title={t("control.settings.behindTitle")} help={t("control.settings.behindHelp")}>
        <NumberField name="behindPlanAlertPoints" label={t("control.settings.behindTitle")} hideLabel unit={t("control.settings.points")} decimals={0} required />
      </SettingCard>
      <SettingCard title={t("control.settings.graceTitle")} help={t("control.settings.graceHelp")}>
        <NumberField name="lateFinishGraceDays" label={t("control.settings.graceTitle")} hideLabel unit={t("teamCompany.settings.days")} decimals={0} required />
      </SettingCard>
      <SettingCard title={t("control.settings.quotaTitle")} help={t("control.settings.quotaHelp")}>
        <NumberField name="quotaAlertPercent" label={t("control.settings.quotaTitle")} hideLabel unit="%" decimals={0} required />
      </SettingCard>
      <SettingCard title={t("control.settings.spendTitle")} help={t("control.settings.spendHelp")}>
        <NumberField name="spendAheadAlertPoints" label={t("control.settings.spendTitle")} hideLabel unit={t("control.settings.points")} decimals={0} required />
      </SettingCard>
      <SettingCard title={t("teamCompany.settings.logTitle")} help={t("teamCompany.settings.logHelp")}>
        <TextField name="missingLogAlertTime" label={t("teamCompany.settings.logLabel")} hideLabel type="time" required />
      </SettingCard>
      <SettingCard title={t("teamCompany.settings.quoteTitle")} help={t("teamCompany.settings.quoteHelp")}>
        <NumberField name="quoteValidityDays" label={t("teamCompany.settings.quoteTitle")} hideLabel unit={t("teamCompany.settings.days")} decimals={0} required />
      </SettingCard>
      <SettingCard title={t("teamCompany.settings.termsTitle")} help={t("teamCompany.settings.termsHelp")}>
        <NumberField name="paymentTermsDays" label={t("teamCompany.settings.termsTitle")} hideLabel unit={t("teamCompany.settings.days")} decimals={0} required />
      </SettingCard>
      <SettingCard title={t("teamCompany.settings.taxRateTitle")} help={t("teamCompany.settings.taxRateHelp")}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField name="taxRatePercent" label={t("teamCompany.settings.taxRate")} hideLabel unit="%" decimals={2} required />
          <TextField name="taxLabel" label={t("teamCompany.settings.taxName")} hideLabel placeholder={t("teamCompany.settings.taxNameExample")} />
        </div>
      </SettingCard>
      <SettingCard title={t("teamCompany.settings.marginTitle")} help={t("teamCompany.settings.marginHelp")}>
        <NumberField name="defaultMarginPercent" label={t("teamCompany.settings.marginTitle")} hideLabel unit="%" decimals={2} required />
      </SettingCard>
      <SettingCard title={t("teamCompany.settings.finishingTitle")} help={t("teamCompany.settings.finishingHelp")}>
        <NumberField name="defaultFinishingAllowancePercent" label={t("teamCompany.settings.finishingTitle")} hideLabel unit="%" decimals={2} required />
      </SettingCard>
      <SettingCard title={t("teamCompany.settings.langTitle")} help={t("teamCompany.settings.langHelp")}>
        <SelectField
          name="defaultLanguage"
          label={t("teamCompany.settings.langTitle")}
          hideLabel
          options={LANGUAGES.map((value) => ({ value, label: te("userLanguage", value) }))}
        />
      </SettingCard>
      <ToggleField name="controlAlertsEnabled" label={t("control.settings.enabled")} description={t("control.settings.enabledDesc")} />
      <ToggleField
        name="pmCanSeeFinancials"
        label={t("teamCompany.settings.pmFinancials")}
        description={t("teamCompany.settings.pmFinancialsDesc")}
      />
      <ToggleField
        name="pmCanRecordPayments"
        label={t("teamCompany.settings.pmPayments")}
        description={t("teamCompany.settings.pmPaymentsDesc")}
      />
      <ToggleField
        name="taxEnabled"
        label={t("teamCompany.settings.taxOn")}
        description={t("teamCompany.settings.taxOnDesc")}
      />
      <FormActions
        submitLabel={t("teamCompany.settings.save")}
        loading={isLoading}
        disabled={readOnly || !form.formState.isDirty}
        onCancel={form.formState.isDirty ? () => form.reset() : undefined}
      />
    </Form>
  );
}
