import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { MembersView } from "@/features/team/views/MembersView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess anyPermission={["team.member.view", "team.member.manage"]}>
        <MembersView />
      </RequireAccess>
    </Suspense>
  );
}
