"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useResetPasswordMutation } from "@/api/services/auth.api";
import type { CompanyChoice } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { FormField, useFieldError } from "@/components/forms/FormField";
import { OtpInput } from "@/components/forms/OtpInput";
import { PasswordField } from "@/components/forms/PasswordField";
import { TextField } from "@/components/forms/TextField";
import { useLanguage } from "@/i18n/useT";
import { applyFieldErrors, companyChoices, errorCode, getErrorMessage } from "@/lib/apiErrors";
import { AuthCard } from "../components/AuthLayout";
import { CompanyPicker } from "../components/CompanyPicker";
import { resetSchema } from "../schemas";

function CodeField() {
  const error = useFieldError("code");
  return (
    <FormField label="Reset code" required error={error}>
      {() => (
        <Controller
          name="code"
          render={({ field }) => <OtpInput value={field.value as string} onChange={field.onChange} invalid={Boolean(error)} label="Reset code" />}
        />
      )}
    </FormField>
  );
}

export function ResetPasswordView() {
  const language = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reset, { isLoading }] = useResetPasswordMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyChoice[] | null>(null);
  const [values, setValues] = useState<z.output<typeof resetSchema> | null>(null);
  const [pickedTenant, setPickedTenant] = useState<string | null>(null);
  const form = useForm<z.input<typeof resetSchema>, unknown, z.output<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { login: searchParams.get("login") ?? "", code: "", newPassword: "", confirmPassword: "" },
  });

  const send = async (input: z.output<typeof resetSchema>, tenantId?: string) => {
    setFormError(null);
    setPickedTenant(tenantId ?? null);
    try {
      await reset({ login: input.login, code: input.code, newPassword: input.newPassword, tenantId }).unwrap();
      toast.success("Password changed. Sign in with your new password.");
      router.replace("/login");
    } catch (err) {
      if (errorCode(err) === "MULTIPLE_COMPANIES") {
        setValues(input);
        setCompanies(companyChoices(err));
        return;
      }
      setCompanies(null);
      if (!applyFieldErrors(err, form.setError, { language, codeFields: { OTP_INVALID: "code", OTP_EXPIRED: "code" } })) {
        setFormError(getErrorMessage(err, language));
      }
    }
  };

  return (
    <AuthCard
      title="Set a new password"
      description="Enter the code we sent you and choose a new password. You'll be signed out everywhere."
      footer={
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Didn&apos;t get a code? Send again
        </Link>
      }
    >
      {companies && values ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">This number belongs to more than one company. Which account?</p>
          <CompanyPicker companies={companies} onPick={(tenantId) => void send(values, tenantId)} pendingTenantId={isLoading ? pickedTenant : null} />
        </div>
      ) : (
        <Form form={form} onSubmit={(v) => send(v)}>
          {formError ? <InlineAlert>{formError}</InlineAlert> : null}
          <TextField name="login" label="Email or phone" required autoComplete="username" />
          <CodeField />
          <PasswordField name="newPassword" label="New password" required autoComplete="new-password" showStrength />
          <PasswordField name="confirmPassword" label="Confirm new password" required autoComplete="new-password" />
          <FormActions submitLabel="Change password" loading={isLoading} fullWidth />
        </Form>
      )}
    </AuthCard>
  );
}
