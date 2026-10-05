"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useForgotPasswordMutation } from "@/api/services/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { TextField } from "@/components/forms/TextField";
import { useLanguage } from "@/i18n/useT";
import { applyFieldErrors, getErrorMessage } from "@/lib/apiErrors";
import { AuthCard } from "../components/AuthLayout";
import { forgotSchema } from "../schemas";

export function ForgotPasswordView() {
  const language = useLanguage();
  const router = useRouter();
  const [forgot, { isLoading }] = useForgotPasswordMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof forgotSchema>, unknown, z.output<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { login: "" },
  });

  const onSubmit = async ({ login }: z.output<typeof forgotSchema>) => {
    setFormError(null);
    try {
      await forgot({ login }).unwrap();
      router.push(`/reset-password?login=${encodeURIComponent(login)}`);
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, { language })) setFormError(getErrorMessage(err, language));
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      description="Enter your phone or email. We'll send a 6-digit reset code by SMS (and email if we have it)."
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
          <KeyRound className="size-6" aria-hidden />
        </span>
      }
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Form form={form} onSubmit={onSubmit}>
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <TextField name="login" label="Email or phone" required autoComplete="username" autoFocus />
        <FormActions submitLabel="Send reset code" loading={isLoading} fullWidth />
      </Form>
    </AuthCard>
  );
}
