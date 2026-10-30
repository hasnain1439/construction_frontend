"use client";

import { RequireAccess } from "@/components/common/RequireAccess";
import { GroupsView } from "@/features/master-data/views/GroupsView";

export default function Page() {
  return (
    <RequireAccess permission="masterdata.material.view">
      <GroupsView />
    </RequireAccess>
  );
}
