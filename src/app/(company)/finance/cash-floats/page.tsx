import { RequireAccess } from "@/components/common/RequireAccess";
import { CashFloatsOverviewView } from "@/features/cashbook/views/CashViews";

export default function Page() {
  return (
    <RequireAccess permission="cashbook.float.view">
      <CashFloatsOverviewView />
    </RequireAccess>
  );
}
