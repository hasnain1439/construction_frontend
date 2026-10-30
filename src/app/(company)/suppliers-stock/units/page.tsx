"use client";

import { RequireAccess } from "@/components/common/RequireAccess";
import { UnitsView } from "@/features/master-data/views/UnitsView";

export default function Page() {
  return (
    <RequireAccess permission="masterdata.material.view">
      <UnitsView />
    </RequireAccess>
  );
}
