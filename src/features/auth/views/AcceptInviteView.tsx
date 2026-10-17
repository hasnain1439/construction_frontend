"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleX, MailOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useAcceptInvitationMutation, useGetInvitationPreviewQuery } from "@/api/services/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PasswordField } from "@/components/forms/PasswordField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/i18n/useT";
import { applyFieldErrors, errorCode, getErrorMessage } from "@/lib/apiErrors";
import { AuthCard } from "../components/AuthLayout";
import { useAfterLogin } from "../hooks/useAfterLogin";
import { acceptInviteSchema } from "../schemas";

const DEAD_LINK = new Set(["INVITE_EXPIRED", "INVITE_CANCELLED", "INVITE_NOT_FOUND"]);

function PasswordFields() {
  const t = useT();
  const munshi = useWatch({ name: "munshi" }) as boolean;
  return (
    <>
      {munshi ? <InlineAlert tone="info">{t("app.auth.munshiSignInInfo")}</InlineAlert> : null}
      <PasswordField
        name="password"
        label={munshi ? t("app.auth.choosePasswordOptional") : t("app.auth.choosePassword")}
        required={!munshi}
        autoComplete="new-password"
        showStrength
      />
      <PasswordField name="confirmPassword" label={t("app.auth.confirmPassword")} required={!munshi} autoComplete="new-password" />
    </>
  );
}

/**
 * Accept a team invitation (link from the SMS or email). A PM sets a password; a Munshi may
 * set one too (password sign-in) or skip it and sign in with a phone code. The backend has no "preview
 * invitation" endpoint, so the company / role are shown after accepting.
 */
export function AcceptInviteView({ token }: { token: string }) {
  const t = useT();
  const language = useLanguage();
  const afterLogin = useAfterLogin();
  const [accept, { isLoading }] = useAcceptInvitationMutation();
  // Name the company and the role in the header (QA-C-16); the generic text is the fallback.
  const previewQuery = useGetInvitationPreviewQuery(token);
  const preview = previewQuery.data;
  const [formError, setFormError] = useState<string | null>(null);
  const [deadCodeAfterAccept, setDeadCode] = useState<string | null>(null);
  // A cancelled / expired / unknown link shows at once, before the form is filled in.
  const previewCode = errorCode(previewQuery.error);
  const deadCode = deadCodeAfterAccept ?? (previewCode && DEAD_LINK.has(previewCode) ? previewCode : null);
  const form = useForm<z.input<typeof acceptInviteSchema>, unknown, z.output<typeof acceptInviteSchema>>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { name: "", password: "", confirmPassword: "", munshi: false },
  });

  const onSubmit = async (values: z.output<typeof acceptInviteSchema>) => {
    setFormError(null);
    try {
      const result = await accept({
        token,
        body: { ...(values.name ? { name: values.name } : {}), ...(values.password ? { password: values.password } : {}) },
      }).unwrap();
      toast.success(t("app.auth.welcomeTo", { name: result.tenant.name }));
      if (result.user.role === "MUNSHI") {
        toast.info(values.password ? t("app.auth.munshiSignInPasswordOrCode") : t("app.auth.munshiSignInCode"));
      }
      await afterLogin("/dashboard", "invite");
    } catch (err) {
      const code = errorCode(err);
      if (code && DEAD_LINK.has(code)) {
        setDeadCode(code);
        return;
      }
      if (code === "INVITE_ALREADY_ACCEPTED") {
        setFormError(getErrorMessage(err, language));
        return;
      }
      if (!applyFieldErrors(err, form.setError, { language })) setFormError(getErrorMessage(err, language));
    }
  };

  if (deadCode) {
    return (
      <AuthCard
        title={deadCode === "INVITE_CANCELLED" ? t("app.auth.inviteCancelled") : deadCode === "INVITE_EXPIRED" ? t("app.auth.inviteExpired") : t("app.auth.linkNotValid")}
        icon={
          <span className="flex size-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
            <CircleX className="size-6" aria-hidden />
          </span>
        }
        description={t("app.auth.askNewLink")}
      >
        <Button asChild className="w-full" variant="outline">
          <Link href="/login">{t("app.auth.goToSignIn")}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("app.auth.invitedTitle")}
      description={
        preview
          ? preview.roleName
            ? t("app.qaFixes.invitedByAs", { company: preview.companyName, role: preview.roleName })
            : t("app.qaFixes.invitedBy", { company: preview.companyName })
          : t("app.auth.invitedDesc")
      }
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
          <MailOpen className="size-6" aria-hidden />
        </span>
      }
      footer={
        <>
          {t("app.auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("app.auth.signIn")}
          </Link>
        </>
      }
    >
      <Form form={form} onSubmit={onSubmit}>
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <TextField name="name" label={t("app.auth.yourName")} autoComplete="name" hint={t("app.auth.inviteNameHint")} />
        <ToggleField name="munshi" label={t("app.auth.iAmMunshi")} description={t("app.auth.iAmMunshiDesc")} />
        <PasswordFields />
        <FormActions submitLabel={t("app.auth.acceptInvitation")} loading={isLoading} fullWidth />
      </Form>
    </AuthCard>
  );
}
