"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Percent, Receipt, Scale } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useUpdateTaxSettingsMutation } from "@/api/services/tax.api";
import type { TaxAuthority, TaxSettings } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { formatPKR } from "@/lib/money";
import { taxOf, taxSettingsSchema, type TaxSettingsValues } from "../schemas";

const defaults = (s: TaxSettings): TaxSettingsValues => ({
  enabled: s.enabled,
  authority: s.authority,
  ratePercent: s.ratePercent,
  label: s.label ?? "",
  ntn: s.ntn ?? "",
  strn: s.strn ?? "",
  whtDefaultRatePercent: s.whtDefaultRatePercent,
});

/** Rs 10,00,000 — the example invoice on the rules card. */
const EXAMPLE_PAISA = "100000000";

/**
 * Settings → Tax: sales tax on invoices (off by default), authority + rate, NTN / STRN, the usual
 * client WHT rate. Read-only without tax.settings.manage. Rates are defaults to check with a tax adviser.
 */
export function TaxSettingsForm({ settings }: { settings: TaxSettings }) {
  const t = useT();
  const te = useEnumT();
  const readOnlyAccount = useReadOnly();
  const canManage = useCan("tax.settings.manage");
  const locked = readOnlyAccount || !canManage;
  const [update, { isLoading }] = useUpdateTaxSettingsMutation();
  const run = useMutationToast();
  const form = useForm<TaxSettingsValues, unknown, z.output<typeof taxSettingsSchema>>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: defaults(settings),
  });
  const [enabled, authority, rate] = useWatch({ control: form.control, name: ["enabled", "authority", "ratePercent"] });
  const info = settings.authorities.find((a) => a.code === authority) ?? null;
  const defaultLabel = info?.defaultLabel ?? "";

  const onSubmit = async (v: z.output<typeof taxSettingsSchema>) => {
    const result = await run(
      () =>
        update({
          enabled: v.enabled,
          authority: v.authority,
          ratePercent: v.ratePercent ?? 0,
          label: v.label || null,
          ntn: v.ntn || null,
          strn: v.strn || null,
          whtDefaultRatePercent: v.whtDefaultRatePercent ?? 0,
        }).unwrap(),
      { success: t("tax.settings.saved"), setError: form.setError, codeFields: { TAX_SETTINGS_INCOMPLETE: "authority" } },
    );
    if (result) form.reset(defaults(result));
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4" id="tax-settings-form">
      <InlineAlert tone="warning" title={t("tax.settings.adviser")}>
        {settings.adviserNote}
      </InlineAlert>
      {!canManage ? <InlineAlert tone="info">{t("tax.settings.readOnly")}</InlineAlert> : null}
      {!enabled ? <InlineAlert tone="info">{t("tax.settings.offBanner")}</InlineAlert> : null}
      <SectionCard>
        <ToggleField name="enabled" label={t("tax.settings.enabled")} description={t("tax.settings.enabledDesc")} disabled={locked} />
      </SectionCard>
      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            <Scale className="size-4" aria-hidden />
            {t("tax.settings.authority")}
          </span>
        }
        description={t("tax.settings.authorityHelp")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            name="authority"
            label={t("tax.settings.authority")}
            disabled={locked}
            placeholder={t("tax.settings.authority")}
            options={settings.authorities.map((a) => ({ value: a.code, label: te("taxAuthority", a.code) }))}
            onValueChange={(code) => {
              const next = settings.authorities.find((a) => a.code === (code as TaxAuthority | null));
              if (next && !form.getValues("ratePercent")) form.setValue("ratePercent", next.defaultRatePercent, { shouldDirty: true });
            }}
          />
          <div className="space-y-1">
            <NumberField name="ratePercent" label={t("tax.settings.rate")} hint={t("tax.settings.rateHelp")} unit="%" decimals={2} disabled={locked} />
            {info && info.defaultRatePercent !== rate && !locked ? (
              <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => form.setValue("ratePercent", info.defaultRatePercent, { shouldDirty: true })}>
                {t("tax.settings.useDefault", { rate: info.defaultRatePercent })}
              </Button>
            ) : null}
          </div>
          <TextField name="label" label={t("tax.settings.label")} hint={defaultLabel ? t("tax.settings.labelHint", { label: defaultLabel }) : undefined} disabled={locked} maxLength={30} />
        </div>
      </SectionCard>
      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            <Receipt className="size-4" aria-hidden />
            {t("tax.settings.registrationTitle")}
          </span>
        }
        description={t("tax.settings.registrationHelp")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="ntn" label={t("tax.settings.ntn")} disabled={locked} maxLength={20} />
          <TextField name="strn" label={t("tax.settings.strn")} disabled={locked} maxLength={20} />
        </div>
      </SectionCard>
      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            <Percent className="size-4" aria-hidden />
            {t("tax.settings.whtTitle")}
          </span>
        }
        description={t("tax.settings.whtHelp")}
      >
        <NumberField name="whtDefaultRatePercent" label={t("tax.settings.whtDefault")} unit="%" decimals={2} disabled={locked} className="max-w-xs" />
      </SectionCard>
      <SectionCard title={t("tax.settings.rulesTitle")}>
        <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
          <li>{t("tax.settings.ruleBase")}</li>
          <li>{t("tax.settings.ruleRound")}</li>
          <li>{t("tax.settings.ruleFrozen")}</li>
          <li>{t("tax.settings.ruleRetention")}</li>
        </ul>
        {rate ? (
          <p className="mt-3 text-sm font-medium" data-testid="tax-example">
            {t("tax.settings.example", { amount: formatPKR(EXAMPLE_PAISA), tax: formatPKR(taxOf(EXAMPLE_PAISA, rate)) })}
          </p>
        ) : null}
      </SectionCard>
      {!locked ? (
        <FormActions submitLabel={t("tax.settings.save")} loading={isLoading} disabled={!form.formState.isDirty} onCancel={form.formState.isDirty ? () => form.reset() : undefined} />
      ) : null}
    </Form>
  );
}
