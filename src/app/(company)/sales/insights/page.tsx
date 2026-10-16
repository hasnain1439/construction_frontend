import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { InsightsView } from "@/features/sales/InsightsView";

export const metadata: Metadata = { title: "Win / Loss Insights" };

export default function Page() {
  return (
    <RequireAccess permission="sales.quote.view">
      <InsightsView />
    </RequireAccess>
  );
}
