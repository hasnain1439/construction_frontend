import { RequireAccess } from "@/components/common/RequireAccess";
import { CountsView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/counts">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="inventory.count.view">
      <CountsView projectId={projectId} />
    </RequireAccess>
  );
}
