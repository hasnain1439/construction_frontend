"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleX, MailOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useAcceptInvitationMutation } from "@/api/services/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PasswordField } from "@/components/forms/PasswordField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/useT";
import { applyFieldErrors, errorCode, getErrorMessage } from "@/lib/apiErrors";
import { AuthCard } from "../components/AuthLayout";
import { useAfterLogin } from "../hooks/useAfterLogin";
import { acceptInviteSchema } from "../schemas";

const DEAD_LINK = new Set(["INVITE_EXPIRED", "INVITE_CANCELLED", "INVITE_NOT_FOUND"]);

function PasswordFields() {
  const munshi = useWatch({ name: "munshi" }) as boolean;
  if (munshi) {
    return (
      <InlineAlert tone="info">
        You&apos;ll sign in with a 6-digit code sent to your phone — no password needed.
      </InlineAlert>
    );
  }
  return (
    <>
      <PasswordField name="password" label="Choose a password" required autoComplete="new-password" showStrength />
      <PasswordField name="confirmPassword" label="Confirm password" required autoComplete="new-password" />
    </>
  );
}

/**
 * Accept a team invitation (link from the SMS). A PM sets a password; a Munshi can join
 * without one and signs in with phone OTP afterwards. The backend has no "preview
 * invitation" endpoint, so the company / role are shown after accepting.
 */
export function AcceptInviteView({ token }: { token: string }) {
  const language = useLanguage();
  const afterLogin = useAfterLogin();
  const [accept, { isLoading }] = useAcceptInvitationMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const [deadCode, setDeadCode] = useState<string | null>(null);
  const form = useForm<z.input<typeof acceptInviteSchema>, unknown, z.output<typeof acceptInviteSchema>>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { name: "", password: "", confirmPassword: "", munshi: false },
  });

  const onSubmit = async (values: z.output<typeof acceptInviteSchema>) => {
    setFormError(null);
    try {
      const result = await accept({
        token,
        body: { ...(values.name ? { name: values.name } : {}), ...(values.munshi ? {} : { password: values.password }) },
      }).unwrap();
      toast.success(`Welcome to ${result.tenant.name}!`);
      if (result.user.role === "MUNSHI") toast.info("Next time, sign in with the phone code (OTP) option.");
      await afterLogin("/dashboard");
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
        title={deadCode === "INVITE_CANCELLED" ? "Invitation cancelled" : deadCode === "INVITE_EXPIRED" ? "Invitation expired" : "Link not valid"}
        icon={
          <span className="flex size-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
            <CircleX className="size-6" aria-hidden />
          </span>
        }
        description="Ask your Thekedar for a new link."
      >
        <Button asChild className="w-full" variant="outline">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="You're invited"
      description="Your Thekedar invited you to join their company on Construction Platform. Set up your account to continue."
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
          <MailOpen className="size-6" aria-hidden />
        </span>
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Form form={form} onSubmit={onSubmit}>
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <TextField name="name" label="Your name" autoComplete="name" hint="Leave empty to keep the name your Thekedar entered." />
        <ToggleField name="munshi" label="I'm a Munshi (site supervisor)" description="Munshis sign in with a phone code instead of a password." />
        <PasswordFields />
        <FormActions submitLabel="Accept invitation" loading={isLoading} fullWidth />
      </Form>
    </AuthCard>
  );
}
