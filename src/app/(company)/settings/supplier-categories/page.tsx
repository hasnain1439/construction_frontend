import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SupplierCategoriesView } from "@/features/master-data/views/SupplierCategoriesView";

export const metadata: Metadata = { title: "Supplier Categories" };

export default function SupplierCategoriesPage() {
  return (
    <RequireAccess permission="masterdata.supplier.manage">
      <SupplierCategoriesView />
    </RequireAccess>
  );
}
