import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchaseDetailView } from "@/features/procurement/views/PurchaseDetailView";

export default async function Page({ params }: PageProps<"/suppliers-stock/purchases/[purchaseId]">) {
  const { purchaseId } = await params;
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <PurchaseDetailView purchaseId={purchaseId} />
    </RequireAccess>
  );
}
