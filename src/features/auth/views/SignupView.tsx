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
import { useEnumT, useLanguage, useT } from "@/i18n/useT";
import { applyFieldErrors, getErrorMessage } from "@/lib/apiErrors";
import { MARLA_OPTIONS, REGION_OPTIONS } from "@/lib/options";
import { AuthCard } from "../components/AuthLayout";
import { useAfterLogin } from "../hooks/useAfterLogin";
import { signupSchema } from "../schemas";

export function SignupView() {
  const t = useT();
  const te = useEnumT();
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
      toast.success(t("app.auth.trialStarted"));
      await afterLogin("/dashboard", "signup");
    } catch (err) {
      const applied = applyFieldErrors(err, form.setError, {
        language,
        codeFields: { PHONE_TAKEN: "phone", EMAIL_TAKEN: "email" },
      });
      if (!applied) setFormError(getErrorMessage(err, language));
    }
  };

  const regionOptions = REGION_OPTIONS.map((o) => ({ ...o, title: te("region", o.value), description: te("regionDesc", o.value) }));
  const marlaOptions = MARLA_OPTIONS.map((o) => ({ ...o, label: t("app.auth.marlaOption", { n: o.value }) }));

  return (
    <AuthCard
      title={t("app.auth.createCompanyTitle")}
      description={t("app.auth.createCompanyDesc")}
      footer={
        <>
          {t("app.auth.alreadyRegistered")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("app.auth.signIn")}
          </Link>
        </>
      }
    >
      <Form form={form} onSubmit={onSubmit}>
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <TextField name="companyName" label={t("app.auth.companyName")} required placeholder={t("app.auth.companyNamePlaceholder")} autoFocus />
        <FieldGrid>
          <TextField name="ownerName" label={t("app.auth.yourName")} required autoComplete="name" />
          <PhoneField name="phone" label={t("field.phone")} required />
        </FieldGrid>
        <TextField name="email" label={t("field.email")} type="email" autoComplete="email" hint={t("app.auth.emailHint")} />
        <PasswordField name="password" label={t("field.password")} required autoComplete="new-password" showStrength hint={t("app.auth.passwordHint")} />
        <RadioCards name="region" label={t("app.auth.region")} required options={regionOptions} />
        <SegmentedField name="marlaStandard" label={t("app.auth.marlaStandard")} options={marlaOptions} hint={t("app.auth.marlaHint")} />
        <FormActions submitLabel={t("app.auth.startFreeTrial")} loading={isLoading} fullWidth />
      </Form>
    </AuthCard>
  );
}
