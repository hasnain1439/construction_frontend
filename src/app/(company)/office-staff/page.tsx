import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { StaffListView } from "@/features/finance/views/StaffViews";

export const metadata: Metadata = { title: "Office Staff" };

export default function Page() {
  return (
    <RequireAccess permission="finance.staff.view">
      <StaffListView />
    </RequireAccess>
  );
}
