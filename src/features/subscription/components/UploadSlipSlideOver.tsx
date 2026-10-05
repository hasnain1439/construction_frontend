"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useSubmitPaymentMutation } from "@/api/services/subscription.api";
import type { PlanOption } from "@/api/types";
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
import { useMutationToast } from "@/hooks/useMutationToast";
import { datePlusDays, todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/options";
import { paymentSlipSchema } from "../schemas";

const FORM_ID = "payment-slip-form";
type Values = z.input<typeof paymentSlipSchema>;

function SlipField() {
  const error = useFieldError("slip");
  return (
    <FormField label="Payment screenshot" required error={error} hint="Photo or PDF of the receipt (max 10 MB)">
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
  const { setValue, getFieldState } = useFormContext<Values>();
  const planId = useWatch({ name: "planId" }) as string;
  const plan = plans.find((p) => p.id === planId);
  // The amount must equal the plan price — follow the chosen plan unless typed over.
  useEffect(() => {
    if (plan && !getFieldState("amountPaisa").isDirty) setValue("amountPaisa", plan.pricePaisa);
  }, [plan, setValue, getFieldState]);
  return plan ? (
    <InlineAlert tone="info">
      Pay exactly <strong>{formatPKR(plan.pricePaisa)}</strong> for one month of {plan.name}.
    </InlineAlert>
  ) : null;
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
  const [submit, { isLoading }] = useSubmitPaymentMutation();
  const run = useMutationToast();
  const priceOf = (id: string) => plans.find((p) => p.id === id)?.pricePaisa ?? null;
  const form = useForm<Values, unknown, z.output<typeof paymentSlipSchema>>({
    resolver: zodResolver(paymentSlipSchema),
    values: {
      planId: defaultPlanId,
      method: "EASYPAISA",
      transactionId: "",
      amountPaisa: priceOf(defaultPlanId),
      paidOn: todayPK(),
      slip: null,
    },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = async (values: z.output<typeof paymentSlipSchema>) => {
    const result = await run(
      () =>
        submit({
          planId: values.planId,
          method: values.method,
          transactionId: values.transactionId,
          amountPaisa: values.amountPaisa,
          paidOn: values.paidOn,
          attachmentId: values.slip!.id,
        }).unwrap(),
      {
        success: "Payment slip sent — we'll review it shortly",
        setError: form.setError,
        codeFields: {
          AMOUNT_MISMATCH: "amountPaisa",
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
      title="Upload payment slip"
      description="Send the money first, then upload the receipt here. Approval activates 30 days."
      busy={isLoading}
      footer={<FormActions formId={FORM_ID} submitLabel="Submit for review" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <SelectField
          name="planId"
          label="Plan"
          required
          options={plans.map((p) => ({ value: p.id, label: `${p.name} — ${formatPKR(p.pricePaisa)} / month` }))}
        />
        <ExpectedAmount plans={plans} />
        <FieldGrid>
          <SelectField name="method" label="Paid with" required options={[...PAYMENT_METHOD_OPTIONS]} />
          <TextField name="transactionId" label="Transaction ID" required uppercase placeholder="EP2610030117" />
        </FieldGrid>
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <DateField name="paidOn" label="Paid on" required min={datePlusDays(-30)} max={todayPK()} />
        </FieldGrid>
        <SlipField />
      </Form>
    </SlideOver>
  );
}
