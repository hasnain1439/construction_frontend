import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { PaymentTemplatesView } from "@/features/master-data/views/PaymentTemplatesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="masterdata.template.view">
        <PaymentTemplatesView />
      </RequireAccess>
    </Suspense>
  );
}
