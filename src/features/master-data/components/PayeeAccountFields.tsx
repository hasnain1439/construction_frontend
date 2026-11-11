"use client";

import { z } from "zod";
import { FieldGrid, FormSection } from "@/components/forms/Form";
import { TextField } from "@/components/forms/TextField";
import { msg } from "@/i18n/message";
import { useT } from "@/i18n/useT";

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || v.length >= min, msg("masterData.v.tooShort", { n: min }))
    .max(max, msg("validation.tooLongPlain"));

/** Form fields for where to send a supplier's / sub-contractor's money (all optional). */
export const payeeAccountSchema = {
  bankName: text(2, 60),
  accountTitle: text(2, 80),
  accountNumber: text(4, 40),
  iban: text(4, 40),
};

export interface PayeeAccount {
  bankName?: string | null;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
}

export const payeeAccountValues = (s: PayeeAccount | null | undefined) => ({
  bankName: s?.bankName ?? "",
  accountTitle: s?.accountTitle ?? "",
  accountNumber: s?.accountNumber ?? "",
  iban: s?.iban ?? "",
});

type Filled = { bankName: string; accountTitle: string; accountNumber: string; iban: string };
/** New record: only the filled fields. */
export const payeeAccountCreate = (v: Filled) =>
  Object.fromEntries(Object.entries({ bankName: v.bankName, accountTitle: v.accountTitle, accountNumber: v.accountNumber, iban: v.iban }).filter(([, x]) => x)) as Partial<Filled>;
/** Edit: an emptied field is cleared. */
export const payeeAccountUpdate = (v: Filled) => ({
  bankName: v.bankName || null,
  accountTitle: v.accountTitle || null,
  accountNumber: v.accountNumber || null,
  iban: v.iban || null,
});

export function PayeeAccountFields() {
  const t = useT();
  return (
    <FormSection title={t("masterData.payee.title")} description={t("masterData.payee.desc")}>
      <FieldGrid>
        <TextField name="bankName" label={t("masterData.payee.bankName")} placeholder={t("masterData.payee.bankPlaceholder")} />
        <TextField name="accountTitle" label={t("masterData.payee.accountTitle")} />
      </FieldGrid>
      <FieldGrid>
        <TextField name="accountNumber" label={t("masterData.payee.accountNumber")} dir="ltr" />
        <TextField name="iban" label={t("cashSite.accounts.iban")} dir="ltr" />
      </FieldGrid>
    </FormSection>
  );
}

/** Read-only rows for a detail page (empty when nothing was filled in). */
export function payeeAccountItems(s: PayeeAccount, t: ReturnType<typeof useT>) {
  return [
    { label: t("masterData.payee.bankName"), value: s.bankName || null, hidden: !s.bankName },
    { label: t("masterData.payee.accountTitle"), value: s.accountTitle || null, hidden: !s.accountTitle },
    { label: t("masterData.payee.accountNumber"), value: s.accountNumber ? <bdi dir="ltr">{s.accountNumber}</bdi> : null, hidden: !s.accountNumber },
    { label: t("cashSite.accounts.iban"), value: s.iban ? <bdi dir="ltr">{s.iban}</bdi> : null, hidden: !s.iban },
  ];
}
