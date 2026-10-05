import { RequireAccess } from "@/components/common/RequireAccess";
import { SupplierPaymentsView } from "@/features/procurement/views/SupplierMoneyViews";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]} permission="rates.view">
      <SupplierPaymentsView />
    </RequireAccess>
  );
}
