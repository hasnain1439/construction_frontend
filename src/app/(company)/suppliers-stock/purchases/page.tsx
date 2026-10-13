import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchasesView } from "@/features/procurement/views/PurchasesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="procurement.purchase.view">
        <PurchasesView />
      </RequireAccess>
    </Suspense>
  );
}
