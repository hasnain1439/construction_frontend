import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SubcontractorsView } from "@/features/master-data/views/WorkforceViews";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR", "PM", "MUNSHI"]}>
        <SubcontractorsView />
      </RequireAccess>
    </Suspense>
  );
}
