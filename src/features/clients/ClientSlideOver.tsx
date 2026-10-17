"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateClientMutation, useUpdateClientMutation } from "@/api/services/clients.api";
import type { Client } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PhoneField } from "@/components/forms/PhoneInput";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { msg } from "@/i18n/message";
import { useT } from "@/i18n/useT";
import { formatPhone } from "@/lib/phone";
import { anyPhoneSchema, optionalEmailSchema, requiredText } from "@/lib/validation";

export const clientSchema = z.object({
  name: requiredText("field.name", 2, 80),
  phone: anyPhoneSchema,
  email: optionalEmailSchema,
  address: z.string().trim().max(300, msg("validation.tooLongPlain")),
  notes: z.string().trim().max(1000, msg("validation.tooLongPlain")),
  /** Step 18: NTN / CNIC (printed on taxed invoices). */
  ntn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9A-Za-z-]{5,20}$/.test(v), msg("tax.v.regNo"))
    .optional(),
});

const FORM_ID = "client-form";
type Values = z.input<typeof clientSchema>;

export function ClientSlideOver({
  open,
  client,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  client: Client | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (client: Client) => void;
}) {
  const t = useT();
  const [create, { isLoading: creating }] = useCreateClientMutation();
  const [update, { isLoading: updating }] = useUpdateClientMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    values: {
      name: client?.name ?? "",
      phone: client ? formatPhone(client.phone) : "",
      email: client?.email ?? "",
      address: client?.address ?? "",
      notes: client?.notes ?? "",
      ntn: client?.ntn ?? "",
    },
  });

  const onSubmit = async (v: z.output<typeof clientSchema>) => {
    const options = { setError: form.setError, codeFields: { CLIENT_PHONE_TAKEN: "phone" } };
    const result = client
      ? await run(
          () =>
            update({
              id: client.id,
              body: { name: v.name, phone: v.phone, email: v.email ?? null, address: v.address || null, notes: v.notes || null, ntn: v.ntn || null },
            }).unwrap(),
          { ...options, success: t("masterData.common.saved", { name: v.name }) },
        )
      : await run(
          () =>
            create({
              name: v.name,
              phone: v.phone,
              ...(v.email ? { email: v.email } : {}),
              ...(v.address ? { address: v.address } : {}),
              ...(v.notes ? { notes: v.notes } : {}),
              ...(v.ntn ? { ntn: v.ntn } : {}),
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
      title={client ? t("masterData.common.editTitle", { name: client.name }) : t("masterData.clients.newClient")}
      description={t("masterData.clients.formDesc")}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={client ? t("masterData.clients.save") : t("masterData.clients.add")} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <FieldGrid>
          <TextField name="name" label={t("field.name")} required placeholder={t("masterData.clients.namePlaceholder")} />
          <PhoneField name="phone" label={t("field.phone")} required allowLandline />
        </FieldGrid>
        <FieldGrid>
          <TextField name="email" label={t("field.email")} type="email" />
          <TextField name="ntn" label={t("tax.client.ntn")} hint={t("tax.client.ntnHint")} maxLength={20} />
        </FieldGrid>
        <TextareaField name="address" label={t("field.address")} rows={2} />
        <TextareaField name="notes" label={t("field.notes")} rows={3} />
      </Form>
    </SlideOver>
  );
}
