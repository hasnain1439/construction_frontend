import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { HolidaysPageHeader, HolidaysPanel } from "@/features/company/components/HolidaysPanel";

export const metadata: Metadata = { title: "Holidays" };

export default function HolidaysPage() {
  return (
    <RequireAccess permission="company.holiday.manage">
      <HolidaysPageHeader />
      <HolidaysPanel />
    </RequireAccess>
  );
}
