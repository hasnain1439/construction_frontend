import { RequireAccess } from "@/components/common/RequireAccess";
import { ProjectModel3DView } from "@/features/projects/views/Model3DView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/overview/3d">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="projects.project.view">
      <ProjectModel3DView projectId={projectId} />
    </RequireAccess>
  );
}
