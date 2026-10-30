"use client";

import { RequireAccess } from "@/components/common/RequireAccess";
import { BrandsView } from "@/features/master-data/views/BrandsView";

export default function Page() {
  return (
    <RequireAccess permission="masterdata.material.view">
      <BrandsView />
    </RequireAccess>
  );
}
