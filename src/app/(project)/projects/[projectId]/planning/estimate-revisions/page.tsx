import { EstimateRevisionsView } from "@/features/estimates/EstimateRevisionsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/estimate-revisions">) {
  const { projectId } = await params;
  return <EstimateRevisionsView projectId={projectId} />;
}
