import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { DesignationsView } from "@/features/finance/views/StaffAttendanceViews";

export const metadata: Metadata = { title: "Designations" };

export default function Page() {
  return (
    <RequireAccess permission="finance.staff.view">
      <DesignationsView />
    </RequireAccess>
  );
}
