import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { ProfitLossView } from "@/features/finance/views/FinanceViews";

export const metadata: Metadata = { title: "Profit & Loss" };

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]} permission="profit.view">
      <ProfitLossView />
    </RequireAccess>
  );
}
