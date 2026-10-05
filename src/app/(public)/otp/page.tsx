import type { Metadata } from "next";
import { Suspense } from "react";
import { OtpView } from "@/features/auth/views/OtpView";

export const metadata: Metadata = { title: "Enter code" };

export default function Page() {
  return (
    <Suspense>
      <OtpView />
    </Suspense>
  );
}
