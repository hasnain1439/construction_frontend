import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAccess } from "@/components/common/RequireAccess";
import { HolidaysPanel } from "@/features/company/components/HolidaysPanel";

export const metadata: Metadata = { title: "Holidays" };

export default function HolidaysPage() {
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <PageHeader
        title="Holidays"
        description="National holidays plus your company's own days off. Schedules skip these days."
        breadcrumbs={[{ label: "Settings" }, { label: "Holidays" }]}
      />
      <HolidaysPanel />
    </RequireAccess>
  );
}
