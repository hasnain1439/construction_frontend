import { RequireAccess } from "@/components/common/RequireAccess";
import { TeamOnSiteView } from "@/features/labor/views/TeamViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/team">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="labor.team.view">
      <TeamOnSiteView projectId={projectId} />
    </RequireAccess>
  );
}
