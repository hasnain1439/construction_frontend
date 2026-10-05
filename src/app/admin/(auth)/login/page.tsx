import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { AdminLoginView } from "@/features/auth/views/AdminLoginView";

export const metadata: Metadata = { title: "Platform Console" };

export default function Page() {
  return (
    <AuthLayout>
      <Suspense>
        <AdminLoginView />
      </Suspense>
    </AuthLayout>
  );
}
