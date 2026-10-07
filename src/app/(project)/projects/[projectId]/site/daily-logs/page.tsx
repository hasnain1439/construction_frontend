import { DailyLogsView } from "@/features/site/DailyLogsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/daily-logs">) {
  const { projectId } = await params;
  return <DailyLogsView projectId={projectId} />;
}
