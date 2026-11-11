"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import type { PayeeAccount } from "@/api/types";
import { FieldGrid, FormSection } from "@/components/forms/Form";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { msg } from "@/i18n/message";
import { useT } from "@/i18n/useT";

const MAX_ACCOUNTS = 10;

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || v.length >= min, msg("masterData.v.tooShort", { n: min }))
    .max(max, msg("validation.tooLongPlain"));

const accountRow = z
  .object({
    id: z.string().optional(),
    bankName: z.string().trim().min(2, msg("masterData.v.tooShort", { n: 2 })).max(60, msg("validation.tooLongPlain")),
    accountTitle: text(2, 80),
    accountNumber: text(4, 40),
    iban: text(4, 40),
    forWhat: text(2, 60),
  })
  .refine((a) => Boolean(a.accountNumber || a.iban), { message: msg("masterData.payee.numberOrIban"), path: ["accountNumber"] });

/** Form field for where to send a supplier's / sub-contractor's money: any number of accounts. */
export const payeeAccountSchema = { accounts: z.array(accountRow).max(MAX_ACCOUNTS) };

type Row = z.input<typeof accountRow>;
const emptyRow: Row = { bankName: "", accountTitle: "", accountNumber: "", iban: "", forWhat: "" };

export const payeeAccountValues = (s: { accounts?: PayeeAccount[] } | null | undefined) => ({
  accounts: (s?.accounts ?? []).map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountTitle: a.accountTitle ?? "",
    accountNumber: a.accountNumber ?? "",
    iban: a.iban ?? "",
    forWhat: a.forWhat ?? "",
  })),
});

const toBody = (a: z.output<typeof accountRow>) => ({
  ...(a.id ? { id: a.id } : {}),
  bankName: a.bankName,
  accountTitle: a.accountTitle || null,
  accountNumber: a.accountNumber || null,
  iban: a.iban || null,
  forWhat: a.forWhat || null,
});
type Filled = { accounts: z.output<typeof accountRow>[] };
/** New record: the accounts, when any were added. */
export const payeeAccountCreate = (v: Filled) => (v.accounts.length ? { accounts: v.accounts.map(toBody) } : {});
/** Edit: the whole list (it replaces the saved one). */
export const payeeAccountUpdate = (v: Filled) => ({ accounts: v.accounts.map(toBody) });

export function PayeeAccountFields() {
  const t = useT();
  const { fields, append, remove } = useFieldArray({ name: "accounts" });
  return (
    <FormSection title={t("masterData.payee.title")} description={t("masterData.payee.desc")}>
      {fields.map((field, i) => (
        <div key={field.id} className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{i === 0 ? t("masterData.payee.mainAccount") : t("masterData.payee.accountN", { n: i + 1 })}</p>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label={t("masterData.payee.removeAria", { n: i + 1 })}>
              <Trash2 />
            </Button>
          </div>
          <FieldGrid>
            <TextField name={`accounts.${i}.bankName`} label={t("masterData.payee.bankName")} required placeholder={t("masterData.payee.bankPlaceholder")} />
            <TextField name={`accounts.${i}.forWhat`} label={t("masterData.payee.forWhat")} placeholder={t("masterData.payee.forWhatPlaceholder")} />
          </FieldGrid>
          <TextField name={`accounts.${i}.accountTitle`} label={t("masterData.payee.accountTitle")} />
          <FieldGrid>
            <TextField name={`accounts.${i}.accountNumber`} label={t("masterData.payee.accountNumber")} dir="ltr" />
            <TextField name={`accounts.${i}.iban`} label={t("cashSite.accounts.iban")} dir="ltr" />
          </FieldGrid>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={fields.length >= MAX_ACCOUNTS} onClick={() => append({ ...emptyRow })}>
        <Plus data-icon="inline-start" />
        {t("masterData.payee.addAccount")}
      </Button>
    </FormSection>
  );
}

/** Read-only list of the accounts for a detail page (nothing when there are none). */
export function PayeeAccountsList({ accounts }: { accounts: PayeeAccount[] | undefined }) {
  const t = useT();
  if (!accounts?.length) return null;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {accounts.map((a, i) => (
        <li key={a.id} className="space-y-1 rounded-xl border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{a.bankName}</span>
            {a.forWhat ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t("masterData.payee.forLabel", { what: a.forWhat })}</span> : null}
            {i === 0 && accounts.length > 1 ? <span className="text-xs text-muted-foreground">{t("masterData.payee.mainAccount")}</span> : null}
          </div>
          {a.accountTitle ? <p className="text-muted-foreground">{a.accountTitle}</p> : null}
          {a.accountNumber ? (
            <p>
              <span className="text-muted-foreground">{t("masterData.payee.accountNumber")}: </span>
              <bdi dir="ltr" className="font-mono">
                {a.accountNumber}
              </bdi>
            </p>
          ) : null}
          {a.iban ? (
            <p>
              <span className="text-muted-foreground">{t("cashSite.accounts.iban")}: </span>
              <bdi dir="ltr" className="font-mono">
                {a.iban}
              </bdi>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
