import { RequireAccess } from "@/components/common/RequireAccess";
import { ApprovalsView } from "@/features/procurement/views/ShortageViews";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <ApprovalsView />
    </RequireAccess>
  );
}
