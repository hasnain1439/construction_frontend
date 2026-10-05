import { RequireAccess } from "@/components/common/RequireAccess";
import { DispatchesView } from "@/features/procurement/views/DispatchViews";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <DispatchesView />
    </RequireAccess>
  );
}
