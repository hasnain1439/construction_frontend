import { RequireAccess } from "@/components/common/RequireAccess";
import { GanttView } from "@/features/schedule/views/GanttView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/schedule/gantt">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="schedule.plan.view">
      <GanttView projectId={projectId} />
    </RequireAccess>
  );
}
