import { RequireAccess } from "@/components/common/RequireAccess";
import { SupplierKhataView } from "@/features/procurement/views/SupplierMoneyViews";

export default function Page() {
  return (
    <RequireAccess permission="procurement.ledger.view">
      <SupplierKhataView />
    </RequireAccess>
  );
}
