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
import { formatPhone } from "@/lib/phone";
import { anyPhoneSchema, optionalEmailSchema, requiredText } from "@/lib/validation";

export const clientSchema = z.object({
  name: requiredText("Name", 2, 80),
  phone: anyPhoneSchema,
  email: optionalEmailSchema,
  address: z.string().trim().max(300, "Too long"),
  notes: z.string().trim().max(1000, "Too long"),
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
    },
  });

  const onSubmit = async (v: z.output<typeof clientSchema>) => {
    const options = { setError: form.setError, codeFields: { CLIENT_PHONE_TAKEN: "phone" } };
    const result = client
      ? await run(
          () =>
            update({
              id: client.id,
              body: { name: v.name, phone: v.phone, email: v.email ?? null, address: v.address || null, notes: v.notes || null },
            }).unwrap(),
          { ...options, success: `${v.name} saved` },
        )
      : await run(
          () =>
            create({
              name: v.name,
              phone: v.phone,
              ...(v.email ? { email: v.email } : {}),
              ...(v.address ? { address: v.address } : {}),
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
      title={client ? `Edit ${client.name}` : "New client"}
      description="Home owners don't log in — they receive quotes and statements as PDFs on WhatsApp."
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={client ? "Save client" : "Add client"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <FieldGrid>
          <TextField name="name" label="Name" required placeholder="Ahmed Raza" />
          <PhoneField name="phone" label="Phone" required allowLandline />
        </FieldGrid>
        <TextField name="email" label="Email" type="email" />
        <TextareaField name="address" label="Address" rows={2} />
        <TextareaField name="notes" label="Notes" rows={3} />
      </Form>
    </SlideOver>
  );
}
