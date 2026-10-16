import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { clampWizardTab } from "@/features/projects/constants";
import { ProjectWizard } from "@/features/projects/wizard/ProjectWizard";

export const metadata: Metadata = { title: "Edit project" };

/** Any tab opens directly: `/projects/:id/edit?tab=3`. */
export default async function EditProjectPage({ params, searchParams }: PageProps<"/projects/[projectId]/edit">) {
  const { projectId } = await params;
  const query = await searchParams;
  const tab = clampWizardTab(query.tab);
  return (
    <RequireAccess permission="projects.project.edit">
      <ProjectWizard key={projectId} projectId={projectId} mode="edit" initialTab={tab} />
    </RequireAccess>
  );
}
