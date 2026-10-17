import { RequireAccess } from "@/components/common/RequireAccess";
import { EstimateView } from "@/features/projects/estimate/EstimateView";

export default async function Page({ params, searchParams }: PageProps<"/projects/[projectId]/planning/estimate">) {
  const { projectId } = await params;
  const { rev } = await searchParams;
  return (
    <RequireAccess permission="projects.estimate.view">
      <EstimateView projectId={projectId} initialRevisionId={typeof rev === "string" ? rev : undefined} />
    </RequireAccess>
  );
}
