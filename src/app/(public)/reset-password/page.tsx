import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordView } from "@/features/auth/views/ResetPasswordView";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
