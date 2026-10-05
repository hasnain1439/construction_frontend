"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { adminAuthApi, useAdminLoginMutation, useGetAdminMeQuery } from "@/api/services/admin/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PasswordField } from "@/components/forms/PasswordField";
import { TextField } from "@/components/forms/TextField";
import { useLanguage } from "@/i18n/useT";
import { applyFieldErrors, getErrorMessage } from "@/lib/apiErrors";
import { safeNext } from "@/lib/session";
import { useAppDispatch } from "@/store/hooks";
import { AuthCard } from "../components/AuthLayout";
import { adminLoginSchema } from "../schemas";

/** Platform admin sign-in (separate cookies and session from company users). */
export function AdminLoginView() {
  const language = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useAdminLoginMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const next = safeNext(searchParams.get("next"), "/admin/overview");
  const form = useForm<z.input<typeof adminLoginSchema>, unknown, z.output<typeof adminLoginSchema>>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { data: admin } = useGetAdminMeQuery();
  useEffect(() => {
    if (admin) router.replace(next.startsWith("/admin") ? next : "/admin/overview");
  }, [admin, router, next]);

  const onSubmit = async (values: z.output<typeof adminLoginSchema>) => {
    setFormError(null);
    try {
      await login(values).unwrap();
      await dispatch(adminAuthApi.endpoints.getAdminMe.initiate(undefined, { forceRefetch: true }));
      router.replace(next.startsWith("/admin") ? next : "/admin/overview");
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, { language })) setFormError(getErrorMessage(err, language));
    }
  };

  return (
    <AuthCard
      title="Platform console"
      description="Sign in with your platform admin account."
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
      }
    >
      <Form form={form} onSubmit={onSubmit}>
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <TextField name="email" label="Email" type="email" required autoComplete="username" autoFocus />
        <PasswordField name="password" label="Password" required />
        <FormActions submitLabel="Sign in" loading={isLoading} fullWidth />
      </Form>
    </AuthCard>
  );
}
