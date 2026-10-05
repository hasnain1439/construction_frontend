import { RequireAccess } from "@/components/common/RequireAccess";
import { ShortagesView } from "@/features/procurement/views/ShortageViews";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <ShortagesView />
    </RequireAccess>
  );
}
