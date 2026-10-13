import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchaseOrderFormView } from "@/features/procurement/views/PurchaseOrderViews";

export default async function Page({ params }: PageProps<"/suppliers-stock/purchase-orders/[orderId]/edit">) {
  const { orderId } = await params;
  return (
    <RequireAccess permission="procurement.order.create">
      <PurchaseOrderFormView orderId={orderId} />
    </RequireAccess>
  );
}
