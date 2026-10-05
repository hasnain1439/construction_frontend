import type { Metadata } from "next";
import { Suspense } from "react";
import { SelectCompanyView } from "@/features/auth/views/SelectCompanyView";

export const metadata: Metadata = { title: "Choose a company" };

export default function Page() {
  return (
    <Suspense>
      <SelectCompanyView />
    </Suspense>
  );
}
