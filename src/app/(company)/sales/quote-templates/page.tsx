import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { QuoteTemplatesView } from "@/features/sales/QuoteTemplatesView";

export const metadata: Metadata = { title: "Quotation Templates" };

export default function Page() {
  return (
    <RequireAccess permission="sales.quote.view">
      <QuoteTemplatesView />
    </RequireAccess>
  );
}
