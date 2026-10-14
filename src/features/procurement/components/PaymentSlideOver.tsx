"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useCreateSupplierPaymentMutation } from "@/api/services/procurement.api";
import type { SupplierPaymentMethod } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { todayPK } from "@/lib/dates";
import { useT } from "@/i18n/useT";
import { usePaymentMethodOptions, useSupplierOptions } from "../options";
import { paymentSchema, type PaymentValues } from "../schemas";

/** Pay a supplier (credits the udhaar). Cheques start "pending" until cleared or bounced. */
export function PaymentSlideOver({ open, onOpenChange, supplierId }: { open: boolean; onOpenChange: (open: boolean) => void; supplierId?: string }) {
  const t = useT();
  const methodOptions = usePaymentMethodOptions();
  const [create, { isLoading }] = useCreateSupplierPaymentMutation();
  const run = useMutationToast();
  const suppliers = useSupplierOptions();
  const form = useForm<PaymentValues, unknown, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    values: { supplierId: supplierId ?? null, amountPaisa: null, method: "CASH", paidOn: todayPK(), reference: "", chequeNo: "", chequeDate: "", note: "" },
  });
  const method = useWatch({ control: form.control, name: "method" });

  const onSubmit = async (v: z.output<typeof paymentSchema>) => {
    const result = await run(
      () =>
        create({
          supplierId: v.supplierId,
          amountPaisa: v.amountPaisa,
          method: v.method as SupplierPaymentMethod,
          paidOn: v.paidOn,
          ...(v.reference ? { reference: v.reference } : {}),
          ...(v.method === "CHEQUE" ? { chequeNo: v.chequeNo, ...(v.chequeDate ? { chequeDate: v.chequeDate } : {}) } : {}),
          ...(v.note ? { note: v.note } : {}),
        }).unwrap(),
      { success: (p) => (p.status === "PENDING" ? t("procurement.payment.chequeRecorded") : t("procurement.payment.recorded")), setError: form.setError },
    );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("action.recordPayment")}
      description={t("procurement.payment.desc")}
      busy={isLoading}
      footer={<FormActions formId="payment-form" submitLabel={t("procurement.payment.save")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="payment-form">
        <ComboboxField name="supplierId" label={t("field.supplier")} required options={suppliers.options} loading={suppliers.loading} disabled={Boolean(supplierId)} />
        <FieldGrid>
          <MoneyField name="amountPaisa" label={t("field.amount")} required />
          <DateField name="paidOn" label={t("procurement.payment.paidOn")} required max={todayPK()} />
        </FieldGrid>
        <SelectField name="method" label={t("field.method")} required options={methodOptions} />
        {method === "CHEQUE" ? (
          <FieldGrid>
            <TextField name="chequeNo" label={t("procurement.payment.chequeNo")} required />
            <DateField name="chequeDate" label={t("procurement.payment.chequeDate")} />
          </FieldGrid>
        ) : (
          <TextField name="reference" label={t("field.reference")} placeholder={t("procurement.payment.refPlaceholder")} />
        )}
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
