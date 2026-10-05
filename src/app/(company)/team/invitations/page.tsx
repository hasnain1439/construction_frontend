import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { InvitationsView } from "@/features/team/views/InvitationsView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR"]}>
        <InvitationsView />
      </RequireAccess>
    </Suspense>
  );
}
