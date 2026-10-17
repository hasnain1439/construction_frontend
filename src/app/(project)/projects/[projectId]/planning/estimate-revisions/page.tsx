import { RequireAccess } from "@/components/common/RequireAccess";
import { EstimateRevisionsView } from "@/features/estimates/EstimateRevisionsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/estimate-revisions">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="projects.estimate.view">
      <EstimateRevisionsView projectId={projectId} />
    </RequireAccess>
  );
}
