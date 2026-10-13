import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchaseReturnsView } from "@/features/procurement/views/PurchaseReturnsView";

export default function Page() {
  return (
    <RequireAccess permission="procurement.return.view">
      <PurchaseReturnsView />
    </RequireAccess>
  );
}
