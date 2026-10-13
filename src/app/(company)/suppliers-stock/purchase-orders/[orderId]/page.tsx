import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchaseOrderDetailView } from "@/features/procurement/views/PurchaseOrderViews";

export default async function Page({ params }: PageProps<"/suppliers-stock/purchase-orders/[orderId]">) {
  const { orderId } = await params;
  return (
    <RequireAccess permission="procurement.order.view">
      <PurchaseOrderDetailView orderId={orderId} />
    </RequireAccess>
  );
}
