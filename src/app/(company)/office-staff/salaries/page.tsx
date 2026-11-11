import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SalarySheetView } from "@/features/finance/views/StaffViews";

export const metadata: Metadata = { title: "Salary Sheet" };

export default function Page() {
  return (
    <RequireAccess permission="finance.staff.view">
      <SalarySheetView />
    </RequireAccess>
  );
}
