import { EstimateView } from "@/features/projects/estimate/EstimateView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/estimate">) {
  const { projectId } = await params;
  return <EstimateView projectId={projectId} />;
}
