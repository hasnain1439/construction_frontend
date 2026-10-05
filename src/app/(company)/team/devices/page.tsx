import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { DevicesView } from "@/features/team/views/DevicesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR"]}>
        <DevicesView />
      </RequireAccess>
    </Suspense>
  );
}
