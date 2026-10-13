import { RequireAccess } from "@/components/common/RequireAccess";
import { SupplierPaymentsView } from "@/features/procurement/views/SupplierMoneyViews";

export default function Page() {
  return (
    <RequireAccess permission="procurement.payment.view">
      <SupplierPaymentsView />
    </RequireAccess>
  );
}
