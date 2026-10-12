import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { WorkerTypesView } from "@/features/master-data/views/WorkerTypesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR", "PM", "MUNSHI"]}>
        <WorkerTypesView />
      </RequireAccess>
    </Suspense>
  );
}
