"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateCompanyAccountMutation,
  useUpdateCompanyAccountMutation,
} from "@/api/services/companyAccounts.api";
import type { CompanyAccount, CompanyAccountType } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import {
  COMPANY_ACCOUNT_TYPES,
  companyAccountSchema,
  type CompanyAccountValues,
} from "@/features/finance/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";

/**
 * Add (account = null) or change one account. A wallet or bank needs its title and number; the group
 * cannot change later. Mount it only while open, so the form starts fresh.
 */
export function CompanyAccountSlideOver({
  account,
  type = "CASH",
  onClose,
  onSaved,
}: {
  account: CompanyAccount | null;
  /** The group a new account starts in. */
  type?: CompanyAccountType;
  onClose: () => void;
  onSaved?: (account: CompanyAccount) => void;
}) {
  const t = useT();
  const te = useEnumT();
  const [create, { isLoading: creating }] = useCreateCompanyAccountMutation();
  const [update, { isLoading: updating }] = useUpdateCompanyAccountMutation();
  const run = useMutationToast();
  const busy = creating || updating;
  const form = useForm<CompanyAccountValues, unknown, z.output<typeof companyAccountSchema>>({
    resolver: zodResolver(companyAccountSchema),
    defaultValues: {
      type: account?.type ?? type,
      name: account?.name ?? "",
      accountTitle: account?.accountTitle ?? "",
      accountNumber: account?.accountNumber ?? "",
      iban: account?.iban ?? "",
      branch: account?.branch ?? "",
      note: account?.note ?? "",
    },
  });
  const chosen = useWatch({ control: form.control, name: "type" });
  const cash = chosen === "CASH";
  const bank = chosen === "BANK";

  const onSubmit = async (v: z.output<typeof companyAccountSchema>) => {
    const feedback = {
      setError: form.setError,
      codeFields: { COMPANY_ACCOUNT_EXISTS: "name", COMPANY_ACCOUNT_DETAILS_REQUIRED: "accountNumber" },
    };
    const saved = account
      ? await run(
          () =>
            update({
              id: account.id,
              body: {
                name: v.name,
                accountTitle: v.accountTitle || null,
                accountNumber: v.accountNumber || null,
                iban: bank ? v.iban || null : null,
                branch: bank ? v.branch || null : null,
                note: v.note || null,
              },
            }).unwrap(),
          { ...feedback, success: t("cashSite.accounts.updated", { name: v.name }) },
        )
      : await run(
          () =>
            create({
              type: v.type,
              name: v.name,
              ...(v.accountTitle ? { accountTitle: v.accountTitle } : {}),
              ...(v.accountNumber ? { accountNumber: v.accountNumber } : {}),
              ...(bank && v.iban ? { iban: v.iban } : {}),
              ...(bank && v.branch ? { branch: v.branch } : {}),
              ...(v.note ? { note: v.note } : {}),
            }).unwrap(),
          { ...feedback, success: t("cashSite.accounts.added", { name: v.name }) },
        );
    if (!saved) return;
    onSaved?.(saved);
    onClose();
  };

  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      title={account ? t("cashSite.accounts.editTitle", { name: account.name }) : t("cashSite.accounts.add")}
      description={t("cashSite.accounts.formDesc")}
      busy={busy}
      footer={
        <FormActions
          formId="company-account-form"
          submitLabel={t("common.save")}
          loading={busy}
          onCancel={onClose}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="company-account-form">
        <SelectField
          name="type"
          label={t("cashSite.accounts.group")}
          required
          disabled={Boolean(account)}
          hint={account ? t("cashSite.accounts.groupFixed") : undefined}
          options={COMPANY_ACCOUNT_TYPES.map((value) => ({ value, label: te("companyAccountType", value) }))}
        />
        <TextField
          name="name"
          label={t("cashSite.accounts.name")}
          required
          maxLength={60}
          placeholder={
            cash
              ? t("cashSite.accounts.namePhCash")
              : bank
                ? t("cashSite.accounts.namePhBank")
                : t("cashSite.accounts.namePhWallet")
          }
        />
        {cash ? null : (
          <FieldGrid>
            <TextField
              name="accountTitle"
              label={t("cashSite.accounts.accountTitle")}
              required
              maxLength={100}
            />
            <TextField
              name="accountNumber"
              label={t("cashSite.accounts.accountNumber")}
              required
              maxLength={40}
            />
          </FieldGrid>
        )}
        {bank ? (
          <FieldGrid>
            <TextField name="iban" label={t("cashSite.accounts.iban")} maxLength={40} />
            <TextField name="branch" label={t("cashSite.accounts.branch")} maxLength={100} />
          </FieldGrid>
        ) : null}
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
