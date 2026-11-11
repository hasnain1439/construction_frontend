import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { StaffView } from "@/features/finance/views/StaffViews";

export const metadata: Metadata = { title: "Staff & Salaries" };

export default function Page() {
  return (
    <RequireAccess permission="finance.staff.view">
      <StaffView />
    </RequireAccess>
  );
}
