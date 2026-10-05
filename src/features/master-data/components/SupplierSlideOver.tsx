"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useCreateSupplierMutation, useUpdateSupplierMutation } from "@/api/services/masterData.api";
import type { Supplier } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PhoneField } from "@/components/forms/PhoneInput";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatPhone } from "@/lib/phone";
import { supplierSchema } from "../schemas";

const FORM_ID = "supplier-form";
type Values = z.input<typeof supplierSchema>;

const toValues = (s: Supplier | null): Values => ({
  name: s?.name ?? "",
  category: s?.category ?? "",
  phone: s?.phone ? formatPhone(s.phone) : "",
  city: s?.city ?? "",
  address: s?.address ?? "",
  ntn: s?.ntn ?? "",
  notes: s?.notes ?? "",
});

export function SupplierSlideOver({
  open,
  supplier,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  supplier: Supplier | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (supplier: Supplier) => void;
}) {
  const [create, { isLoading: creating }] = useCreateSupplierMutation();
  const [update, { isLoading: updating }] = useUpdateSupplierMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof supplierSchema>>({ resolver: zodResolver(supplierSchema), values: toValues(supplier) });

  const onSubmit = async (v: z.output<typeof supplierSchema>) => {
    const options = { setError: form.setError, codeFields: { SUPPLIER_EXISTS: "name" } };
    const result = supplier
      ? await run(
          () =>
            update({
              id: supplier.id,
              body: {
                name: v.name,
                category: v.category,
                phone: v.phone ?? null,
                city: v.city || null,
                address: v.address || null,
                ntn: v.ntn || null,
                notes: v.notes || null,
              },
            }).unwrap(),
          { ...options, success: `${v.name} saved` },
        )
      : await run(
          () =>
            create({
              name: v.name,
              category: v.category,
              ...(v.phone ? { phone: v.phone } : {}),
              ...(v.city ? { city: v.city } : {}),
              ...(v.address ? { address: v.address } : {}),
              ...(v.ntn ? { ntn: v.ntn } : {}),
              ...(v.notes ? { notes: v.notes } : {}),
            }).unwrap(),
          { ...options, success: `${v.name} added` },
        );
    if (result) {
      onOpenChange(false);
      onSaved?.(result);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={supplier ? `Edit ${supplier.name}` : "Add supplier"}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={supplier ? "Save supplier" : "Add supplier"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label="Supplier name" required placeholder="Al-Madina Cement Agency" />
        <FieldGrid>
          <TextField name="category" label="Category" required placeholder="Cement" />
          <PhoneField name="phone" label="Phone" allowLandline />
        </FieldGrid>
        <FieldGrid>
          <TextField name="city" label="City" placeholder="Lahore" />
          <TextField name="ntn" label="NTN" placeholder="1234567-8" />
        </FieldGrid>
        <TextareaField name="address" label="Address" rows={2} />
        <TextareaField name="notes" label="Notes" rows={2} />
      </Form>
    </SlideOver>
  );
}
