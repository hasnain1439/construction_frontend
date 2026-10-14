"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGetMeQuery } from "@/api/services/auth.api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/useT";
import { safeNext } from "@/lib/session";
import { AuthCard } from "../components/AuthLayout";
import { OtpRequestForm, PasswordLoginForm } from "../components/LoginForms";

export function LoginView() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("password");
  const [otpPhone, setOtpPhone] = useState<string | undefined>();

  // Silent check: a still-valid session (or refresh cookie) skips the form.
  const { data: me } = useGetMeQuery();
  useEffect(() => {
    if (me) router.replace(safeNext(searchParams.get("next"), "/dashboard"));
  }, [me, router, searchParams]);

  return (
    <AuthCard
      title={t("app.auth.signIn")}
      description={t("app.auth.signInDesc")}
      footer={
        <>
          {t("app.auth.newCompany")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("app.auth.startTrialLink")}
          </Link>
        </>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid h-10! w-full grid-cols-2">
          <TabsTrigger value="password">
            {/* Short label on phones, where the long one does not fit the pill. */}
            <span className="sm:hidden">{t("app.auth.tabPassword")}</span>
            <span className="max-sm:hidden">{t("app.auth.tabPasswordLong")}</span>
          </TabsTrigger>
          <TabsTrigger value="otp">{t("app.auth.tabOtp")}</TabsTrigger>
        </TabsList>
        <TabsContent value="password">
          <PasswordLoginForm
            onUseOtp={(phone) => {
              setOtpPhone(phone);
              setTab("otp");
            }}
          />
        </TabsContent>
        <TabsContent value="otp">
          {tab === "otp" && otpPhone ? (
            <p className="mb-4 rounded-lg bg-info-soft px-3 py-2 text-sm">{t("app.auth.otpAccountNote")}</p>
          ) : null}
          <OtpRequestForm key={otpPhone ?? "otp"} defaultPhone={otpPhone} />
        </TabsContent>
      </Tabs>
    </AuthCard>
  );
}
