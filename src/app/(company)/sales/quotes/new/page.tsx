import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { NewQuoteView } from "@/features/sales/NewQuoteView";

export const metadata: Metadata = { title: "New Quote" };

export default function Page() {
  return (
    <RequireAccess permission="sales.quote.create">
      <NewQuoteView />
    </RequireAccess>
  );
}
