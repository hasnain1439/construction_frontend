"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import {
  useGetCompanyAccountGroupsQuery,
  useGetCompanyAccountsQuery,
} from "@/api/services/companyAccounts.api";
import type { CompanyAccountType } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { FieldGrid } from "@/components/forms/Form";
import { SelectField } from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { CompanyAccountSlideOver } from "@/features/finance/components/CompanyAccountSlideOver";
import { useEnumT, useT } from "@/i18n/useT";

const SITE_CASH = "SITE_CASH";

/** What this form saves for each kind of group, in its own "how it was paid" field. */
export interface HowPaid {
  /** The form field that holds it. */
  name: string;
  CASH: string;
  WALLET: string;
  BANK: string;
  /** A bank-type group also asks transfer or cheque. */
  cheque?: string;
  /** Offers the holder's site cash too: no company account moves. */
  siteCash?: string;
}

/**
 * Where the money moved: the company's payment group, then one of its accounts, with its balance for
 * who may see it. Needs the form fields `groupId` and `companyAccountId`; check the choice on submit
 * with useCompanyAccountCheck. Leave `how` out when the flow has no "how it was paid" of its own.
 */
export function CompanyAccountField({ how, label }: { how?: HowPaid; label?: string }) {
  const t = useT();
  const te = useEnumT();
  const form = useFormContext();
  const canAdd = useCan("finance.account.manage");
  const groups = useGetCompanyAccountGroupsQuery();
  const accounts = useGetCompanyAccountsQuery({ active: true });
  const [adding, setAdding] = useState(false);
  const groupId = useWatch({ control: form.control, name: "groupId" }) as string | null;
  const accountId = useWatch({ control: form.control, name: "companyAccountId" }) as string | null;
  const group = groups.data?.find((g) => g.id === groupId);
  const inGroup = useMemo(
    () => (accounts.data ?? []).filter((a) => a.group.id === groupId),
    [accounts.data, groupId],
  );
  const chosen = inGroup.find((a) => a.id === accountId);

  // How it was paid and the account follow the group in the same update: a select that mounts or
  // changes options while its value is not one of them clears the field.
  const pickGroup = useCallback(
    (id: string | null) => {
      if (how && id === SITE_CASH && how.siteCash) {
        form.setValue(how.name, how.siteCash);
        form.setValue("companyAccountId", null);
        return;
      }
      const next = groups.data?.find((g) => g.id === id);
      if (!next) return;
      if (how) {
        const current = form.getValues(how.name);
        if (next.type !== "BANK") form.setValue(how.name, how[next.type]);
        else if (current !== how.BANK && current !== how.cheque) form.setValue(how.name, how.BANK);
      }
      const options = (accounts.data ?? []).filter((a) => a.group.id === next.id);
      const current = form.getValues("companyAccountId") as string | null;
      if (!options.some((a) => a.id === current))
        form.setValue("companyAccountId", options.length === 1 ? options[0]!.id : null);
    },
    [groups.data, accounts.data, form, how],
  );

  // Opens on the group of the account already chosen, else the first bank-type group.
  useEffect(() => {
    if (form.getValues("groupId") || !groups.data?.length || !accounts.data) return;
    const held = accounts.data.find((a) => a.id === form.getValues("companyAccountId"));
    const first = held?.group.id ?? (groups.data.find((g) => g.type === "BANK") ?? groups.data[0]!).id;
    form.setValue("groupId", first);
    pickGroup(first);
  }, [groups.data, accounts.data, form, pickGroup]);

  // The list changed (an account was added or switched off): keep a choice that still fits.
  useEffect(() => {
    if (!accounts.data || !group) return;
    const current = form.getValues("companyAccountId") as string | null;
    if (current && inGroup.some((a) => a.id === current)) return;
    form.setValue("companyAccountId", inGroup.length === 1 ? inGroup[0]!.id : null);
  }, [inGroup, accounts.data, group, form]);

  const options = [
    ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name })),
    ...(how?.siteCash ? [{ value: SITE_CASH, label: te("laborPaidFrom", SITE_CASH) }] : []),
  ];
  const type: CompanyAccountType | undefined = group?.type;

  return (
    <div className="space-y-3" data-testid="company-account-field">
      <FieldGrid>
        <SelectField
          name="groupId"
          label={label ?? t("cashSite.accounts.paymentGroup")}
          required
          onValueChange={pickGroup}
          options={options}
        />
        {inGroup.length ? (
          <SelectField
            name="companyAccountId"
            label={t("cashSite.accounts.account")}
            required
            options={inGroup.map((a) => ({
              value: a.id,
              label: a.accountNumber ? `${a.name} · ${a.accountNumber}` : a.name,
            }))}
          />
        ) : null}
      </FieldGrid>
      {chosen ? (
        <p className="text-sm text-muted-foreground" data-testid="payment-account-details">
          {[chosen.accountTitle, chosen.iban, chosen.branch].filter(Boolean).join(" · ")}
          {chosen.balancePaisa !== null ? (
            <>
              {chosen.accountTitle ? " · " : ""}
              {t("cashSite.accounts.balance")}:{" "}
              <MoneyText
                paisa={chosen.balancePaisa}
                className={chosen.balancePaisa.startsWith("-") ? "font-medium text-danger" : "font-medium"}
              />
            </>
          ) : null}
        </p>
      ) : null}
      {accounts.data && group && !inGroup.length ? (
        <InlineAlert
          tone="warning"
          title={t("cashSite.accounts.noneInGroup", { group: group.name })}
          action={
            canAdd ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
                {t("cashSite.accounts.add")}
              </Button>
            ) : undefined
          }
        >
          {t("cashSite.accounts.noneInGroupDesc")}
        </InlineAlert>
      ) : null}
      {how?.cheque && type === "BANK" ? (
        <SelectField
          name={how.name}
          label={t("field.method")}
          required
          options={[
            { value: how.BANK, label: te("clientPaymentMethod", "BANK_TRANSFER") },
            { value: how.cheque, label: te("clientPaymentMethod", "CHEQUE") },
          ]}
        />
      ) : null}
      {/* A submit in here would bubble through React to the form around this field. */}
      <div onSubmit={(e) => e.stopPropagation()}>
        {adding ? (
          <CompanyAccountSlideOver
            account={null}
            groupId={groupId}
            onClose={() => setAdding(false)}
            onSaved={(a) => form.setValue("companyAccountId", a.id)}
          />
        ) : null}
      </div>
    </div>
  );
}

/** On submit: a group that has accounts needs one chosen. Returns false (and marks the field) when not. */
export function useCompanyAccountCheck<T extends FieldValues>(
  form: UseFormReturn<T, unknown, never> | UseFormReturn<T, unknown, unknown>,
  opts: { skip?: boolean } = {},
) {
  const t = useT();
  const accounts = useGetCompanyAccountsQuery({ active: true }, { skip: opts.skip ?? false });
  return (v: { groupId?: string | null; companyAccountId?: string | null }) => {
    if (opts.skip || v.companyAccountId || !v.groupId) return true;
    if (!accounts.data?.some((a) => a.group.id === v.groupId)) return true;
    (form as UseFormReturn<FieldValues>).setError("companyAccountId" as Path<FieldValues>, {
      message: t("cashSite.accounts.chooseAccount"),
    });
    return false;
  };
}
