import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchaseOrdersView } from "@/features/procurement/views/PurchaseOrderViews";

export default function Page() {
  return (
    <RequireAccess permission="procurement.order.view">
      <PurchaseOrdersView />
    </RequireAccess>
  );
}
