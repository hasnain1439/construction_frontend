"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useLoginMutation, useRequestOtpMutation } from "@/api/services/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Form } from "@/components/forms/Form";
import { CheckboxField } from "@/components/forms/CheckboxField";
import { FormActions } from "@/components/forms/FormActions";
import { PasswordField } from "@/components/forms/PasswordField";
import { PhoneField } from "@/components/forms/PhoneInput";
import { TextField } from "@/components/forms/TextField";
import { useLanguage, useT } from "@/i18n/useT";
import { applyFieldErrors, companyChoices, errorCode, getErrorMessage } from "@/lib/apiErrors";
import { useAfterLogin } from "../hooks/useAfterLogin";
import { setPendingLogin } from "../pendingLogin";
import { loginSchema, otpRequestSchema } from "../schemas";

/** Query string for the OTP page (phone + timers from POST /auth/otp/request). */
export function otpPageHref(phone: string, timers: { expiresIn?: number; resendAfter?: number }, next?: string | null) {
  const params = new URLSearchParams({ phone });
  if (timers.expiresIn) params.set("exp", String(timers.expiresIn));
  if (timers.resendAfter) params.set("resend", String(timers.resendAfter));
  if (next) params.set("next", next);
  return `/otp?${params.toString()}`;
}

/** Email or phone + password. */
export function PasswordLoginForm({ onUseOtp }: { onUseOtp: (phone?: string) => void }) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterLogin = useAfterLogin();
  const [login, { isLoading }] = useLoginMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "", rememberMe: true },
  });

  const onSubmit = async (values: z.output<typeof loginSchema>) => {
    setFormError(null);
    try {
      await login(values).unwrap();
      await afterLogin();
    } catch (err) {
      const code = errorCode(err);
      if (code === "MULTIPLE_COMPANIES") {
        setPendingLogin({
          kind: "password",
          login: values.login,
          password: values.password,
          rememberMe: values.rememberMe,
          companies: companyChoices(err),
          next: searchParams.get("next") ?? undefined,
        });
        router.push("/select-company");
        return;
      }
      if (code === "USE_OTP_LOGIN") {
        onUseOtp(values.login.startsWith("+92") ? values.login : undefined);
        return;
      }
      if (code === "COMPANY_SUSPENDED") {
        router.push("/suspended");
        return;
      }
      if (!applyFieldErrors(err, form.setError, { language })) setFormError(getErrorMessage(err, language));
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit}>
      {formError ? <InlineAlert>{formError}</InlineAlert> : null}
      <TextField name="login" label={t("app.auth.emailOrPhone")} required autoComplete="username" placeholder={t("app.auth.loginPlaceholder")} autoFocus />
      <PasswordField name="password" label={t("field.password")} required />
      <div className="flex items-center justify-between gap-3">
        <CheckboxField name="rememberMe" label={t("app.auth.rememberMe")} />
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          {t("app.auth.forgotPasswordLink")}
        </Link>
      </div>
      <FormActions submitLabel={t("app.auth.signIn")} loading={isLoading} fullWidth />
    </Form>
  );
}

/** Phone → SMS code (Munshis, or anyone who prefers OTP). */
export function OtpRequestForm({ defaultPhone }: { defaultPhone?: string }) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requestOtp, { isLoading }] = useRequestOtpMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof otpRequestSchema>, unknown, z.output<typeof otpRequestSchema>>({
    resolver: zodResolver(otpRequestSchema),
    defaultValues: { phone: defaultPhone ?? "" },
  });

  const onSubmit = async ({ phone }: z.output<typeof otpRequestSchema>) => {
    setFormError(null);
    try {
      const result = await requestOtp({ phone, purpose: "LOGIN" }).unwrap();
      router.push(otpPageHref(phone, result, searchParams.get("next")));
    } catch (err) {
      if (errorCode(err) === "OTP_RESEND_WAIT") {
        // A code was sent less than a minute ago — go and enter it.
        router.push(otpPageHref(phone, {}, searchParams.get("next")));
        return;
      }
      if (!applyFieldErrors(err, form.setError, { language, codeFields: { PHONE_NOT_REGISTERED: "phone" } })) {
        setFormError(getErrorMessage(err, language));
      }
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit}>
      {formError ? <InlineAlert>{formError}</InlineAlert> : null}
      <PhoneField name="phone" label={t("app.auth.mobileNumber")} required hint={t("app.auth.smsCodeHint")} />
      <FormActions submitLabel={t("app.auth.sendCode")} loading={isLoading} fullWidth />
    </Form>
  );
}
