"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useSignupMutation } from "@/api/services/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PasswordField } from "@/components/forms/PasswordField";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextField } from "@/components/forms/TextField";
import { useLanguage } from "@/i18n/useT";
import { applyFieldErrors, getErrorMessage } from "@/lib/apiErrors";
import { MARLA_OPTIONS, REGION_OPTIONS } from "@/lib/options";
import { AuthCard } from "../components/AuthLayout";
import { useAfterLogin } from "../hooks/useAfterLogin";
import { signupSchema } from "../schemas";

export function SignupView() {
  const language = useLanguage();
  const afterLogin = useAfterLogin();
  const [signup, { isLoading }] = useSignupMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof signupSchema>, unknown, z.output<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { companyName: "", ownerName: "", phone: "", email: "", password: "", region: "PUNJAB_KP", marlaStandard: "225" },
  });

  const onSubmit = async (values: z.output<typeof signupSchema>) => {
    setFormError(null);
    try {
      await signup({ ...values, marlaStandard: Number(values.marlaStandard) as 225 | 272.25 }).unwrap();
      toast.success("Welcome! Your 14-day free trial has started.");
      await afterLogin("/dashboard");
    } catch (err) {
      const applied = applyFieldErrors(err, form.setError, {
        language,
        codeFields: { PHONE_TAKEN: "phone", EMAIL_TAKEN: "email" },
      });
      if (!applied) setFormError(getErrorMessage(err, language));
    }
  };

  return (
    <AuthCard
      title="Create your company"
      description="14-day free trial, 1 project, no card needed."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Form form={form} onSubmit={onSubmit}>
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <TextField name="companyName" label="Company name" required placeholder="Malik & Sons Builders" autoFocus />
        <FieldGrid>
          <TextField name="ownerName" label="Your name" required autoComplete="name" />
          <PhoneField name="phone" label="Phone" required />
        </FieldGrid>
        <TextField name="email" label="Email" type="email" autoComplete="email" hint="Optional — for password resets." />
        <PasswordField name="password" label="Password" required autoComplete="new-password" showStrength hint="At least 8 characters with a letter and a number." />
        <RadioCards name="region" label="Region" required options={REGION_OPTIONS} />
        <SegmentedField name="marlaStandard" label="Marla standard" options={MARLA_OPTIONS} hint="Square feet in one marla in your area." />
        <FormActions submitLabel="Start free trial" loading={isLoading} fullWidth />
      </Form>
    </AuthCard>
  );
}
