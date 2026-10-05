import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { LaborRatesView } from "@/features/master-data/views/LaborRatesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR"]}>
        <LaborRatesView />
      </RequireAccess>
    </Suspense>
  );
}
