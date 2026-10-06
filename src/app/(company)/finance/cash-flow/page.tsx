import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CashFlowView } from "@/features/finance/views/FinanceViews";

export const metadata: Metadata = { title: "Cash Flow Outlook" };

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <CashFlowView />
    </RequireAccess>
  );
}
