import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupView } from "@/features/auth/views/SignupView";

export const metadata: Metadata = { title: "Create your company" };

export default function Page() {
  return (
    <Suspense>
      <SignupView />
    </Suspense>
  );
}
