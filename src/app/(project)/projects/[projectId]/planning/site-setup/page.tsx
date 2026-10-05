import { SiteSetupView } from "@/features/projects/views/ProjectModeViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/site-setup">) {
  const { projectId } = await params;
  return <SiteSetupView projectId={projectId} />;
}
