import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { WorkersView } from "@/features/master-data/views/WorkforceViews";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR", "PM", "MUNSHI"]}>
        <WorkersView />
      </RequireAccess>
    </Suspense>
  );
}
