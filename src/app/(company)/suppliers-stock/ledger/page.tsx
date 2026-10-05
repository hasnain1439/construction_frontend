import { RequireAccess } from "@/components/common/RequireAccess";
import { SupplierKhataView } from "@/features/procurement/views/SupplierMoneyViews";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]} permission="rates.view">
      <SupplierKhataView />
    </RequireAccess>
  );
}
