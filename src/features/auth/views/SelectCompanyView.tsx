"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLoginMutation, useVerifyOtpMutation } from "@/api/services/auth.api";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useLanguage } from "@/i18n/useT";
import { errorCode, getErrorMessage } from "@/lib/apiErrors";
import { AuthCard } from "../components/AuthLayout";
import { CompanyPicker } from "../components/CompanyPicker";
import { useAfterLogin } from "../hooks/useAfterLogin";
import { clearPendingLogin, getPendingLogin } from "../pendingLogin";

/** After 409 MULTIPLE_COMPANIES: choose a company and resend with `tenantId`. */
export function SelectCompanyView() {
  const language = useLanguage();
  const router = useRouter();
  const afterLogin = useAfterLogin();
  const [pending] = useState(getPendingLogin);
  const [busyTenant, setBusyTenant] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [login] = useLoginMutation();
  const [verify] = useVerifyOtpMutation();

  useEffect(() => {
    if (!pending) router.replace("/login");
  }, [pending, router]);

  if (!pending) return null;

  const pick = async (tenantId: string) => {
    setBusyTenant(tenantId);
    setError(null);
    try {
      if (pending.kind === "password") {
        await login({ login: pending.login, password: pending.password, tenantId }).unwrap();
      } else {
        await verify({ phone: pending.phone, code: pending.code, tenantId }).unwrap();
      }
      clearPendingLogin();
      await afterLogin(pending.next);
    } catch (err) {
      setBusyTenant(null);
      if (errorCode(err) === "COMPANY_SUSPENDED") {
        router.push("/suspended");
        return;
      }
      setError(getErrorMessage(err, language));
    }
  };

  return (
    <AuthCard
      title="Choose a company"
      description="Your number works for more than one company. Which one do you want to open?"
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
          <Building2 className="size-6" aria-hidden />
        </span>
      }
      footer={
        <Link href="/login" onClick={() => clearPendingLogin()} className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-4">
        {error ? <InlineAlert>{error}</InlineAlert> : null}
        <CompanyPicker companies={pending.companies} onPick={(id) => void pick(id)} pendingTenantId={busyTenant} />
      </div>
    </AuthCard>
  );
}
