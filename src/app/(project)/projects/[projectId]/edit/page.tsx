import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { ProjectWizard } from "@/features/projects/wizard/ProjectWizard";

export const metadata: Metadata = { title: "Edit project" };

/** Any tab opens directly: `/projects/:id/edit?tab=3`. */
export default async function EditProjectPage({ params, searchParams }: PageProps<"/projects/[projectId]/edit">) {
  const { projectId } = await params;
  const query = await searchParams;
  const tab = Math.min(6, Math.max(1, Number(query.tab) || 1));
  return (
    <RequireAccess permission="projects.manage">
      <ProjectWizard key={projectId} projectId={projectId} mode="edit" initialTab={tab} />
    </RequireAccess>
  );
}
