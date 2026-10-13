import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { DevicesView } from "@/features/team/views/DevicesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="team.member.manage">
        <DevicesView />
      </RequireAccess>
    </Suspense>
  );
}
