import { RequireAccess } from "@/components/common/RequireAccess";
import { MilestonesQuotasView } from "@/features/schedule/views/MilestonesQuotasView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/schedule/milestones">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="schedule.plan.view">
      <MilestonesQuotasView projectId={projectId} />
    </RequireAccess>
  );
}
