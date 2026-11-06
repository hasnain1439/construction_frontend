"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useGetPaymentAccountsQuery, useSubmitPaymentMutation } from "@/api/services/subscription.api";
import type { PaymentAccount, PlanOption } from "@/api/types";
import { ErrorState } from "@/components/common/ErrorState";
import { FileUpload } from "@/components/common/FileUpload";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SlideOver } from "@/components/common/SlideOver";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { FormField, useFieldError } from "@/components/forms/FormField";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { msg } from "@/i18n/message";
import { useMutationToast } from "@/hooks/useMutationToast";
import { datePlusDays, todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { useEnumT, useT } from "@/i18n/useT";
import { paymentSlipSchema } from "../schemas";

const FORM_ID = "payment-slip-form";
const METHODS = ["JAZZCASH", "EASYPAISA", "RAAST", "IBFT"] as const;
/** Sample transaction ID shown in the empty field (a code, the same in every language). */
const TRANSACTION_EXAMPLE = "EP2610030117";
type Values = z.input<typeof paymentSlipSchema>;

function SlipField() {
  const t = useT();
  const error = useFieldError("slip");
  return (
    <FormField label={t("teamCompany.slip.screenshot")} required error={error} hint={t("teamCompany.slip.screenshotHint")}>
      {() => (
        <Controller
          name="slip"
          render={({ field }) => <FileUpload kind="PAYMENT_SLIP" value={field.value} onChange={field.onChange} invalid={Boolean(error)} />}
        />
      )}
    </FormField>
  );
}

function ExpectedAmount({ plans }: { plans: PlanOption[] }) {
  const t = useT();
  const { setValue, getFieldState } = useFormContext<Values>();
  const planId = useWatch({ name: "planId" }) as string;
  const plan = plans.find((p) => p.id === planId);
  // The amount must equal the plan price — follow the chosen plan unless typed over.
  useEffect(() => {
    if (plan && !getFieldState("amountPaisa").isDirty) setValue("amountPaisa", plan.pricePaisa);
  }, [plan, setValue, getFieldState]);
  if (!plan) return null;
  // The amount is bold, so the sentence is split around its placeholder.
  const [before, after] = t("teamCompany.slip.payExactly", { plan: plan.name, amount: "{amount}" }).split("{amount}");
  return (
    <InlineAlert tone="info">
      {before}
      <strong>{formatPKR(plan.pricePaisa)}</strong>
      {after}
    </InlineAlert>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const t = useT();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("teamCompany.slip.copied", { label }));
    } catch {
      toast.error(t("common.somethingWrong"));
    }
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm break-all" dir="ltr">
          {value}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label={t("teamCompany.slip.copy", { label })} onClick={() => void copy()}>
        <Copy aria-hidden />
      </Button>
    </div>
  );
}

/** Which of the platform's accounts the money goes to, with the details to send it. */
function PaidToField({ accounts }: { accounts: PaymentAccount[] }) {
  const t = useT();
  const te = useEnumT();
  const id = useWatch({ name: "paymentAccountId" }) as string | null;
  const account = accounts.find((a) => a.id === id);
  return (
    <>
      <SelectField
        name="paymentAccountId"
        label={t("teamCompany.slip.paidTo")}
        required
        placeholder={t("teamCompany.slip.choosePaidTo")}
        options={accounts.map((a) => ({ value: a.id, label: `${a.name} · ${te("walletMethod", a.method)}` }))}
      />
      {account ? (
        <div className="space-y-2 rounded-xl border p-3" data-testid="payment-account-details">
          <div>
            <p className="text-xs text-muted-foreground">{t("teamCompany.slip.accountTitle")}</p>
            <p className="text-sm font-medium">{account.accountTitle}</p>
          </div>
          <CopyRow label={t("teamCompany.slip.accountNumber")} value={account.accountNumber} />
          {account.iban ? <CopyRow label={t("cashSite.accounts.iban")} value={account.iban} /> : null}
          {account.note ? <p className="text-sm text-muted-foreground">{account.note}</p> : null}
        </div>
      ) : null}
    </>
  );
}

/** Upload a JazzCash / Easypaisa / Raast / bank slip for the platform to approve. */
export function UploadSlipSlideOver({
  open,
  onOpenChange,
  plans,
  defaultPlanId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanOption[];
  defaultPlanId: string;
}) {
  const t = useT();
  const te = useEnumT();
  const [submit, { isLoading }] = useSubmitPaymentMutation();
  const { data: accounts, isLoading: loadingAccounts, error: accountsError, refetch } = useGetPaymentAccountsQuery(undefined, { skip: !open });
  const hasAccounts = Boolean(accounts?.length);
  const run = useMutationToast();
  const priceOf = (id: string) => plans.find((p) => p.id === id)?.pricePaisa ?? null;
  const form = useForm<Values, unknown, z.output<typeof paymentSlipSchema>>({
    resolver: zodResolver(paymentSlipSchema),
    values: {
      planId: defaultPlanId,
      // One account leaves nothing to choose.
      paymentAccountId: accounts?.length === 1 ? accounts[0]!.id : null,
      method: "EASYPAISA",
      transactionId: "",
      amountPaisa: priceOf(defaultPlanId),
      paidOn: todayPK(),
      slip: null,
    },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = async (values: z.output<typeof paymentSlipSchema>) => {
    if (hasAccounts && !values.paymentAccountId) {
      form.setError("paymentAccountId", { message: msg("teamCompany.v.choosePaidTo") });
      return;
    }
    const result = await run(
      () =>
        submit({
          planId: values.planId,
          ...(hasAccounts ? { paymentAccountId: values.paymentAccountId! } : { method: values.method }),
          transactionId: values.transactionId,
          amountPaisa: values.amountPaisa,
          paidOn: values.paidOn,
          attachmentId: values.slip!.id,
        }).unwrap(),
      {
        success: t("teamCompany.slip.sent"),
        setError: form.setError,
        codeFields: {
          AMOUNT_MISMATCH: "amountPaisa",
          PAYMENT_ACCOUNT_REQUIRED: "paymentAccountId",
          PAYMENT_ACCOUNT_NOT_AVAILABLE: "paymentAccountId",
          DUPLICATE_TRANSACTION: "transactionId",
          PAID_ON_IN_FUTURE: "paidOn",
          PAID_ON_TOO_OLD: "paidOn",
          ATTACHMENT_NOT_FOUND: "slip",
        },
      },
    );
    if (result) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("teamCompany.slip.title")}
      description={t("teamCompany.slip.desc")}
      busy={isLoading}
      footer={<FormActions formId={FORM_ID} submitLabel={t("teamCompany.slip.submit")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <SelectField
          name="planId"
          label={t("teamCompany.slip.plan")}
          required
          options={plans.map((p) => ({ value: p.id, label: t("teamCompany.slip.planOption", { name: p.name, price: formatPKR(p.pricePaisa) }) }))}
        />
        <ExpectedAmount plans={plans} />
        {accountsError ? <ErrorState error={accountsError} onRetry={refetch} compact /> : null}
        {hasAccounts ? <PaidToField accounts={accounts!} /> : null}
        <FieldGrid>
          {hasAccounts || loadingAccounts ? null : (
            <SelectField name="method" label={t("teamCompany.slip.paidWith")} required options={METHODS.map((value) => ({ value, label: te("walletMethod", value) }))} />
          )}
          <TextField name="transactionId" label={t("teamCompany.slip.transactionId")} required uppercase placeholder={TRANSACTION_EXAMPLE} dir="ltr" />
        </FieldGrid>
        <FieldGrid>
          <MoneyField name="amountPaisa" label={t("field.amount")} required />
          <DateField name="paidOn" label={t("teamCompany.slip.paidOn")} required min={datePlusDays(-30)} max={todayPK()} />
        </FieldGrid>
        <SlipField />
      </Form>
    </SlideOver>
  );
}
