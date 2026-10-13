import { RequireAccess } from "@/components/common/RequireAccess";
import { ReceivablesView } from "@/features/billing/views/BillingViews";

export default function Page() {
  return (
    <RequireAccess permission="finance.receivables.view">
      <ReceivablesView />
    </RequireAccess>
  );
}
