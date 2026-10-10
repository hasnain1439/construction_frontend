"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useGetMeQuery } from "@/api/services/auth.api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { safeNext } from "@/lib/session";
import { AuthCard } from "../components/AuthLayout";
import { OtpRequestForm, PasswordLoginForm } from "../components/LoginForms";

export function LoginView() {
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
      title="Sign in"
      description="Welcome back. Use your phone or email and password, or a code sent by SMS."
      footer={
        <>
          New company?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Start a free trial
          </Link>
        </>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid h-10! w-full grid-cols-2">
          <TabsTrigger value="password">
            {/* Short label on phones, where the long one does not fit the pill. */}
            <span className="sm:hidden">Password</span>
            <span className="max-sm:hidden">Email or phone + password</span>
          </TabsTrigger>
          <TabsTrigger value="otp">Phone OTP</TabsTrigger>
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
            <p className="mb-4 rounded-lg bg-info-soft px-3 py-2 text-sm">This account signs in with a phone code.</p>
          ) : null}
          <OtpRequestForm key={otpPhone ?? "otp"} defaultPhone={otpPhone} />
        </TabsContent>
      </Tabs>
    </AuthCard>
  );
}
