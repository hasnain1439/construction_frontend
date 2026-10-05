import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { PurchasesView } from "@/features/procurement/views/PurchasesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR", "PM"]}>
        <PurchasesView />
      </RequireAccess>
    </Suspense>
  );
}
