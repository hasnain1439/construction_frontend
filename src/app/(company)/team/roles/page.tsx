import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { RolesView } from "@/features/team/views/RolesView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="team.member.manage">
        <RolesView />
      </RequireAccess>
    </Suspense>
  );
}
