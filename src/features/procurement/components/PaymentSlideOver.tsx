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
import { PAYMENT_METHOD_OPTIONS, useSupplierOptions } from "../options";
import { paymentSchema, type PaymentValues } from "../schemas";

/** Pay a supplier (credits the udhaar). Cheques start "pending" until cleared or bounced. */
export function PaymentSlideOver({ open, onOpenChange, supplierId }: { open: boolean; onOpenChange: (open: boolean) => void; supplierId?: string }) {
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
      { success: (p) => (p.status === "PENDING" ? "Cheque recorded — pending until it clears" : "Payment recorded"), setError: form.setError },
    );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Record payment"
      description="Reduces what you owe this supplier."
      busy={isLoading}
      footer={<FormActions formId="payment-form" submitLabel="Save payment" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="payment-form">
        <ComboboxField name="supplierId" label="Supplier" required options={suppliers.options} loading={suppliers.loading} disabled={Boolean(supplierId)} />
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <DateField name="paidOn" label="Paid on" required max={todayPK()} />
        </FieldGrid>
        <SelectField name="method" label="Method" required options={PAYMENT_METHOD_OPTIONS} />
        {method === "CHEQUE" ? (
          <FieldGrid>
            <TextField name="chequeNo" label="Cheque no." required />
            <DateField name="chequeDate" label="Cheque date" />
          </FieldGrid>
        ) : (
          <TextField name="reference" label="Reference" placeholder="Transaction ID / receipt no." />
        )}
        <TextareaField name="note" label="Note" rows={2} />
      </Form>
    </SlideOver>
  );
}
