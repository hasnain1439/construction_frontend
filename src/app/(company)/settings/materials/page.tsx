import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { MaterialsView } from "@/features/master-data/views/MaterialsView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="masterdata.material.view">
        <MaterialsView />
      </RequireAccess>
    </Suspense>
  );
}
