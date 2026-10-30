"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useUpdateMeMutation } from "@/api/services/auth.api";
import { SectionCard } from "@/components/common/SectionCard";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PasswordField } from "@/components/forms/PasswordField";
import { TextField } from "@/components/forms/TextField";
import { PageHeader } from "@/components/layout/PageHeader";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { useMe } from "@/store/hooks";
import { changeEmailSchema, changePasswordSchema } from "../schemas";

type EmailValues = z.input<typeof changeEmailSchema>;
type PasswordValues = z.input<typeof changePasswordSchema>;

/** The signed-in user's own login email; the current password is required. */
function EmailCard({ email }: { email: string | null }) {
  const t = useT();
  const [update, { isLoading }] = useUpdateMeMutation();
  const run = useMutationToast();
  const form = useForm<EmailValues, unknown, z.output<typeof changeEmailSchema>>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { email: email ?? "", currentPassword: "" },
  });

  const onSubmit = async (values: z.output<typeof changeEmailSchema>) => {
    const result = await run(() => update(values).unwrap(), {
      success: t("app.account.emailSaved"),
      setError: form.setError,
      codeFields: { EMAIL_TAKEN: "email", CURRENT_PASSWORD_WRONG: "currentPassword" },
    });
    if (result) form.reset({ email: result.user.email ?? values.email, currentPassword: "" });
  };

  return (
    <SectionCard title={t("app.account.emailTitle")} description={t("app.account.emailDesc")}>
      <Form form={form} onSubmit={onSubmit} className="max-w-md space-y-4 pb-5">
        <TextField name="email" label={t("app.account.newEmail")} type="email" inputMode="email" autoComplete="email" required />
        <PasswordField name="currentPassword" label={t("app.account.currentPassword")} required />
        <FormActions submitLabel={t("app.account.saveEmail")} loading={isLoading} align="between" />
      </Form>
    </SectionCard>
  );
}

/** Password change: other devices are signed out, this one stays signed in. */
function PasswordCard() {
  const t = useT();
  const [update, { isLoading }] = useUpdateMeMutation();
  const run = useMutationToast();
  const form = useForm<PasswordValues, unknown, z.output<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async ({ currentPassword, newPassword }: z.output<typeof changePasswordSchema>) => {
    const result = await run(() => update({ currentPassword, newPassword }).unwrap(), {
      success: t("app.account.passwordSaved"),
      setError: form.setError,
      codeFields: { CURRENT_PASSWORD_WRONG: "currentPassword" },
    });
    if (result) form.reset();
  };

  return (
    <SectionCard title={t("app.account.passwordTitle")} description={t("app.account.passwordDesc")}>
      <Form form={form} onSubmit={onSubmit} className="max-w-md space-y-4 pb-5">
        <PasswordField name="currentPassword" label={t("app.account.currentPassword")} required />
        <PasswordField name="newPassword" label={t("app.auth.newPassword")} autoComplete="new-password" showStrength required />
        <PasswordField name="confirmPassword" label={t("app.auth.confirmNewPassword")} autoComplete="new-password" required />
        <FormActions submitLabel={t("app.auth.changePassword")} loading={isLoading} align="between" />
      </Form>
    </SectionCard>
  );
}

export function AccountView() {
  const t = useT();
  const me = useMe();
  if (!me) return null;
  return (
    <>
      <PageHeader title={t("app.account.title")} description={t("app.account.desc")} breadcrumbs={[{ label: t("app.account.title") }]} />
      <div className="space-y-6">
        <EmailCard email={me.user.email} />
        <PasswordCard />
      </div>
    </>
  );
}
