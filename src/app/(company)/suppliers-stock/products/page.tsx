"use client";

import { RequireAccess } from "@/components/common/RequireAccess";
import { ProductsView } from "@/features/master-data/views/ProductsView";

export default function Page() {
  return (
    <RequireAccess permission="masterdata.material.view">
      <ProductsView />
    </RequireAccess>
  );
}
