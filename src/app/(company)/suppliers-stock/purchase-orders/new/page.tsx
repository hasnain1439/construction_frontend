import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchaseOrderFormView } from "@/features/procurement/views/PurchaseOrderViews";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <PurchaseOrderFormView />
    </RequireAccess>
  );
}
