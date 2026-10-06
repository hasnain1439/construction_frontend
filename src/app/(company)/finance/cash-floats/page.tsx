import { RequireAccess } from "@/components/common/RequireAccess";
import { CashFloatsOverviewView } from "@/features/cashbook/views/CashViews";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <CashFloatsOverviewView />
    </RequireAccess>
  );
}
