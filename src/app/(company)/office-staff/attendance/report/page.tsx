import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { AttendanceReportView } from "@/features/finance/views/StaffAttendanceViews";

export const metadata: Metadata = { title: "Attendance Report" };

export default function Page() {
  return (
    <RequireAccess permission="finance.staff.view">
      <AttendanceReportView />
    </RequireAccess>
  );
}
