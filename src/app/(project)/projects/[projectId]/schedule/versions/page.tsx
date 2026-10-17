import { RequireAccess } from "@/components/common/RequireAccess";
import { PlanVersionsView } from "@/features/schedule/views/PlanVersionsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/schedule/versions">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="schedule.plan.view">
      <PlanVersionsView projectId={projectId} />
    </RequireAccess>
  );
}
