import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { MaterialsView } from "@/features/master-data/views/MaterialsView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR", "PM"]}>
        <MaterialsView />
      </RequireAccess>
    </Suspense>
  );
}
