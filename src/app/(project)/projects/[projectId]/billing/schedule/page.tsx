import { RequireAccess } from "@/components/common/RequireAccess";
import { ScheduleView } from "@/features/billing/views/BillingViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/billing/schedule">) {
  const { projectId } = await params;
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]} permission="billing.view">
      <ScheduleView projectId={projectId} />
    </RequireAccess>
  );
}
