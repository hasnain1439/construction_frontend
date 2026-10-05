import { SupplySplitView } from "@/features/projects/views/ProjectModeViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/supply-split">) {
  const { projectId } = await params;
  return <SupplySplitView projectId={projectId} />;
}
