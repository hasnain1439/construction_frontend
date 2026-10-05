import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { ProjectWizard } from "@/features/projects/wizard/ProjectWizard";

export const metadata: Metadata = { title: "New Project" };

const clampTab = (value: string | string[] | undefined) => Math.min(6, Math.max(1, Number(value) || 1));

/** `/projects/new` → tab 1; after the draft is created: `/projects/new?id=…&tab=2`. */
export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  const params = await searchParams;
  const id = typeof params.id === "string" ? params.id : null;
  return (
    <RequireAccess permission="projects.manage">
      <ProjectWizard key={id ?? "new"} projectId={id} mode="new" initialTab={id ? clampTab(params.tab) : 1} />
    </RequireAccess>
  );
}
