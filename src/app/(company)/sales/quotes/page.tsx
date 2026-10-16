import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { QuotePipelineView } from "@/features/sales/QuotePipelineView";

export const metadata: Metadata = { title: "Quote Pipeline" };

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="sales.quote.view">
        <QuotePipelineView />
      </RequireAccess>
    </Suspense>
  );
}
