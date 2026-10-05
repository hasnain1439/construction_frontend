"use client";

import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequestOtpMutation, useVerifyOtpMutation } from "@/api/services/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { OtpInput } from "@/components/forms/OtpInput";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/useT";
import { companyChoices, errorCode, getErrorMessage } from "@/lib/apiErrors";
import { formatPhone, normalisePhone } from "@/lib/phone";
import { AuthCard } from "../components/AuthLayout";
import { useAfterLogin } from "../hooks/useAfterLogin";
import { setPendingLogin } from "../pendingLogin";

const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [left]);
  return [left, setLeft] as const;
}

export function OtpView() {
  const language = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterLogin = useAfterLogin();
  const phone = normalisePhone(searchParams.get("phone")) ?? "";
  const [codeLeft, setCodeLeft] = useCountdown(Number(searchParams.get("exp")) || 300);
  const [resendLeft, setResendLeft] = useCountdown(Number(searchParams.get("resend")) || 60);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verify, { isLoading }] = useVerifyOtpMutation();
  const [requestOtp, { isLoading: resending }] = useRequestOtpMutation();

  useEffect(() => {
    if (!phone) router.replace("/login");
  }, [phone, router]);

  const submit = async (value: string) => {
    if (value.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    try {
      await verify({ phone, code: value }).unwrap();
      await afterLogin();
    } catch (err) {
      const errCode = errorCode(err);
      if (errCode === "MULTIPLE_COMPANIES") {
        setPendingLogin({ kind: "otp", phone, code: value, companies: companyChoices(err), next: searchParams.get("next") ?? undefined });
        router.push("/select-company");
        return;
      }
      if (errCode === "COMPANY_SUSPENDED") {
        router.push("/suspended");
        return;
      }
      setError(getErrorMessage(err, language));
      if (errCode === "OTP_INVALID") setCode("");
    }
  };

  const resend = async () => {
    try {
      const result = await requestOtp({ phone, purpose: "LOGIN" }).unwrap();
      setCodeLeft(result.expiresIn);
      setResendLeft(result.resendAfter);
      setCode("");
      setError(null);
      toast.success(`A new code was sent to ${formatPhone(phone)}`);
    } catch (err) {
      setError(getErrorMessage(err, language));
    }
  };

  return (
    <AuthCard
      title="Enter the code"
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
          <MessageSquareText className="size-6" aria-hidden />
        </span>
      }
      description={
        <>
          We sent a 6-digit code to <span className="font-medium text-foreground">{formatPhone(phone)}</span>.
        </>
      }
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Use a different number
        </Link>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        {error ? <InlineAlert>{error}</InlineAlert> : null}
        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value);
            if (value.length === 6) void submit(value);
          }}
          invalid={Boolean(error)}
          disabled={isLoading}
          autoFocus
        />
        <div className="flex items-center justify-between text-sm">
          <span className={codeLeft > 0 ? "text-muted-foreground" : "font-medium text-danger"} aria-live="polite">
            {codeLeft > 0 ? `Code expires in ${mmss(codeLeft)}` : "Code expired — ask for a new one"}
          </span>
          <Button type="button" variant="link" className="h-auto p-0" disabled={resendLeft > 0 || resending} onClick={() => void resend()}>
            {resendLeft > 0 ? `Resend in ${resendLeft}s` : "Resend code"}
          </Button>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isLoading || code.length !== 6}>
          {isLoading ? "Checking…" : "Verify & sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
