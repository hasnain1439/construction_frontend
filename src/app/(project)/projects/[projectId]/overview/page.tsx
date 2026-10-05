import { ProjectOverviewView } from "@/features/projects/views/ProjectModeViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/overview">) {
  const { projectId } = await params;
  return <ProjectOverviewView projectId={projectId} />;
}
