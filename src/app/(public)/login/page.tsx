import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginView } from "@/features/auth/views/LoginView";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
