import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { AttendanceMarkView } from "@/features/finance/views/StaffAttendanceViews";

export const metadata: Metadata = { title: "Mark Attendance" };

export default function Page() {
  return (
    <RequireAccess permission="finance.staff.manage">
      <AttendanceMarkView />
    </RequireAccess>
  );
}
