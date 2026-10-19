import { RequireAccess } from "@/components/common/RequireAccess";
import { UsageView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/usage">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="inventory.stock.view">
      <UsageView projectId={projectId} />
    </RequireAccess>
  );
}
