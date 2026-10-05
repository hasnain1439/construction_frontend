import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SuppliersView } from "@/features/master-data/views/SuppliersView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR", "PM"]}>
        <SuppliersView />
      </RequireAccess>
    </Suspense>
  );
}
