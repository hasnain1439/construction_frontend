"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCopy, HardHat, UserCog } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useGetCompanySettingsQuery } from "@/api/services/company.api";
import { useCreateInvitationMutation } from "@/api/services/team.api";
import type { InvitationSent } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SlideOver } from "@/components/common/SlideOver";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards, type RadioCardOption } from "@/components/forms/RadioCards";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate } from "@/lib/dates";
import { inviteSchema } from "../schemas";

const FORM_ID = "invite-form";

export const ROLE_CARDS: RadioCardOption<"PM" | "MUNSHI">[] = [
  { value: "PM", title: "Project Manager", description: "Runs assigned projects on the web and phone. Uses an office seat.", icon: UserCog },
  { value: "MUNSHI", title: "Munshi", description: "Site supervisor on the phone app (OTP login). Free — no seat.", icon: HardHat },
];

function FinancialsToggle() {
  const role = useWatch({ name: "role" });
  if (role !== "PM") return null;
  return (
    <ToggleField
      name="canSeeFinancials"
      label="Can see contract value, billing & profit"
      description="Off: these fields show as “Hidden for your role”."
    />
  );
}

export function InviteMemberSlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [create, { isLoading }] = useCreateInvitationMutation();
  const { data: settings } = useGetCompanySettingsQuery(undefined, { skip: !open });
  const { options, isLoading: loadingProjects } = useProjectOptions({ skip: !open });
  const [sent, setSent] = useState<(InvitationSent & { name: string }) | null>(null);
  const run = useMutationToast();
  const form = useForm<z.input<typeof inviteSchema>, unknown, z.output<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    values: {
      name: "",
      phone: "",
      email: "",
      role: "PM",
      projectIds: [],
      canSeeFinancials: settings?.pmCanSeeFinancials ?? false,
    },
    resetOptions: { keepDirtyValues: true },
  });

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setSent(null);
      form.reset();
    }
  };

  const onSubmit = async (values: z.output<typeof inviteSchema>) => {
    const result = await run(
      () =>
        create({
          name: values.name,
          phone: values.phone,
          ...(values.email ? { email: values.email } : {}),
          role: values.role,
          projectIds: values.projectIds,
          ...(values.role === "PM" ? { canSeeFinancials: values.canSeeFinancials } : {}),
        }).unwrap(),
      {
        success: `Invite sent to ${values.name}`,
        setError: form.setError,
        codeFields: { ALREADY_MEMBER: "phone", INVITE_PENDING: "phone", PHONE_TAKEN: "phone" },
      },
    );
    if (result) setSent({ ...result, name: values.name });
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={close}
      title="Invite member"
      description="They get an SMS with a link to join. Links expire after 7 days."
      busy={isLoading}
      footer={
        sent ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSent(null)}>
              Invite another
            </Button>
            <Button onClick={() => close(false)}>Done</Button>
          </div>
        ) : (
          <FormActions formId={FORM_ID} submitLabel="Send invite" loading={isLoading} onCancel={() => close(false)} />
        )
      }
    >
      {sent ? (
        <div className="space-y-4">
          <InlineAlert tone="success" title={`Invite sent to ${sent.name}`}>
            Pending · expires {formatDate(sent.expiresAt)}
          </InlineAlert>
          {sent.devInviteUrl ? (
            <div className="space-y-2 rounded-xl border p-4">
              <p className="text-sm font-medium">Development invite link</p>
              <p className="text-xs break-all text-muted-foreground">{sent.devInviteUrl}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(sent.devInviteUrl!);
                  toast.success("Link copied");
                }}
              >
                <ClipboardCopy data-icon="inline-start" />
                Copy link
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
          <FieldGrid>
            <TextField name="name" label="Name" required />
            <PhoneField name="phone" label="Phone" required />
          </FieldGrid>
          <TextField name="email" label="Email" type="email" hint="Optional" />
          <RadioCards name="role" label="Role" required options={ROLE_CARDS} />
          <ComboboxField
            name="projectIds"
            label="Projects"
            multiple
            options={options}
            loading={loadingProjects}
            placeholder="Choose projects"
            hint="They will only see these projects."
          />
          <FinancialsToggle />
        </Form>
      )}
    </SlideOver>
  );
}
