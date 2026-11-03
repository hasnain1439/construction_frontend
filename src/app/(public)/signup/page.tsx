import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignupView } from "@/features/auth/views/SignupView";
import { SIGNUP_ENABLED } from "@/lib/signup";

export const metadata: Metadata = { title: "Create your company" };

export default function Page() {
  if (!SIGNUP_ENABLED) redirect("/login");
  return (
    <Suspense>
      <SignupView />
    </Suspense>
  );
}
