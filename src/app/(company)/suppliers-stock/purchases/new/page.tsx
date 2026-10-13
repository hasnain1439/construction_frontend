import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { NewPurchaseView } from "@/features/procurement/views/NewPurchaseView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="procurement.purchase.create">
        <NewPurchaseView />
      </RequireAccess>
    </Suspense>
  );
}
