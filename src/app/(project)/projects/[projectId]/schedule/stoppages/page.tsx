import { RequireAccess } from "@/components/common/RequireAccess";
import { StoppagesView } from "@/features/schedule/views/StoppagesView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/schedule/stoppages">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="schedule.plan.view">
      <StoppagesView projectId={projectId} />
    </RequireAccess>
  );
}
