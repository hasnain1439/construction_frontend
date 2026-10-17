import { RequireAccess } from "@/components/common/RequireAccess";
import { IncomingView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/incoming">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="procurement.dispatch.view">
      <IncomingView projectId={projectId} />
    </RequireAccess>
  );
}
