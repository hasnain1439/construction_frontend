import { RequireAccess } from "@/components/common/RequireAccess";
import { DailyLogsView } from "@/features/site/DailyLogsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/daily-logs">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="dailylog.log.view">
      <DailyLogsView projectId={projectId} />
    </RequireAccess>
  );
}
