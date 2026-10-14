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
import { useT } from "@/i18n/useT";
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
  const t = useT();
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
          { ...options, success: t("masterData.common.saved", { name: v.name }) },
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
          { ...options, success: t("masterData.common.added", { name: v.name }) },
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
      title={supplier ? t("masterData.common.editTitle", { name: supplier.name }) : t("masterData.suppliers.add")}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={supplier ? t("masterData.suppliers.save") : t("masterData.suppliers.add")} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label={t("masterData.suppliers.name")} required placeholder={t("masterData.suppliers.namePlaceholder")} />
        <FieldGrid>
          <TextField name="category" label={t("field.category")} required placeholder={t("masterData.suppliers.categoryPlaceholder")} />
          <PhoneField name="phone" label={t("field.phone")} allowLandline />
        </FieldGrid>
        <FieldGrid>
          <TextField name="city" label={t("field.city")} placeholder={t("masterData.suppliers.cityPlaceholder")} />
          <TextField name="ntn" label={t("field.ntn")} placeholder="1234567-8" dir="ltr" />
        </FieldGrid>
        <TextareaField name="address" label={t("field.address")} rows={2} />
        <TextareaField name="notes" label={t("field.notes")} rows={2} />
      </Form>
    </SlideOver>
  );
}
