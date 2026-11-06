"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateCompanyAccountMutation,
  useGetCompanyAccountGroupsQuery,
  useUpdateCompanyAccountMutation,
} from "@/api/services/companyAccounts.api";
import type { CompanyAccount } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { companyAccountSchema, type CompanyAccountValues } from "@/features/finance/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";

/**
 * Add (account = null) or change one account. The chosen group says which details it needs; the group
 * cannot change later. Mount it only while open, so the form starts fresh.
 */
export function CompanyAccountSlideOver({
  account,
  groupId,
  onClose,
  onSaved,
}: {
  account: CompanyAccount | null;
  /** The group a new account starts in. */
  groupId?: string | null;
  onClose: () => void;
  onSaved?: (account: CompanyAccount) => void;
}) {
  const t = useT();
  const groups = useGetCompanyAccountGroupsQuery();
  const [create, { isLoading: creating }] = useCreateCompanyAccountMutation();
  const [update, { isLoading: updating }] = useUpdateCompanyAccountMutation();
  const run = useMutationToast();
  const busy = creating || updating;
  const form = useForm<CompanyAccountValues, unknown, z.output<typeof companyAccountSchema>>({
    resolver: zodResolver(companyAccountSchema),
    defaultValues: {
      groupId: account?.group.id ?? groupId ?? null,
      name: account?.name ?? "",
      openingBalancePaisa: account?.openingBalancePaisa ?? null,
      accountTitle: account?.accountTitle ?? "",
      accountNumber: account?.accountNumber ?? "",
      iban: account?.iban ?? "",
      branch: account?.branch ?? "",
      note: account?.note ?? "",
    },
  });
  const chosen = useWatch({ control: form.control, name: "groupId" });
  const type = account?.group.type ?? groups.data?.find((g) => g.id === chosen)?.type;
  const cash = type === "CASH";
  const bank = type === "BANK";

  const onSubmit = async (v: z.output<typeof companyAccountSchema>) => {
    if (!cash && v.accountTitle.length < 2) {
      form.setError("accountTitle", { message: t("cashSite.accounts.enterTitle") });
      return;
    }
    if (!cash && v.accountNumber.length < 4) {
      form.setError("accountNumber", { message: t("cashSite.accounts.enterNumber") });
      return;
    }
    const feedback = {
      setError: form.setError,
      codeFields: {
        COMPANY_ACCOUNT_EXISTS: "name",
        COMPANY_ACCOUNT_DETAILS_REQUIRED: "accountNumber",
        INVALID_COMPANY_ACCOUNT_GROUP: "groupId",
      },
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
                ...(v.openingBalancePaisa !== (account.openingBalancePaisa ?? null)
                  ? { openingBalancePaisa: v.openingBalancePaisa ?? "0" }
                  : {}),
              },
            }).unwrap(),
          { ...feedback, success: t("cashSite.accounts.updated", { name: v.name }) },
        )
      : await run(
          () =>
            create({
              groupId: v.groupId,
              name: v.name,
              ...(v.openingBalancePaisa ? { openingBalancePaisa: v.openingBalancePaisa } : {}),
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
          name="groupId"
          label={t("cashSite.accounts.group")}
          required
          disabled={Boolean(account)}
          hint={account ? t("cashSite.accounts.groupFixed") : undefined}
          options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
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
        <MoneyField
          name="openingBalancePaisa"
          label={t("cashSite.accounts.openingBalance")}
          hint={t("cashSite.accounts.openingHint")}
        />
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
