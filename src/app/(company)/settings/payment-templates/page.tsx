import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { PaymentTemplatesView } from "@/features/master-data/views/PaymentTemplatesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR"]}>
        <PaymentTemplatesView />
      </RequireAccess>
    </Suspense>
  );
}
