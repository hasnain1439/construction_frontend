import type { Metadata } from "next";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SuspendedView } from "@/features/auth/views/SuspendedView";

export const metadata: Metadata = { title: "Account suspended" };

export default function Page() {
  return (
    <AuthLayout>
      <SuspendedView />
    </AuthLayout>
  );
}
