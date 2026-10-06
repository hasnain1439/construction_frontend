import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { ApprovalsInboxView } from "@/features/dashboard/views/ApprovalsInboxView";

export const metadata: Metadata = { title: "My Approvals" };

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <ApprovalsInboxView />
    </RequireAccess>
  );
}
