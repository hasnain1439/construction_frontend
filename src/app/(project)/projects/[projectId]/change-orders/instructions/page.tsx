import { SiteInstructionsView } from "@/features/change-orders/SiteInstructionsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders/instructions">) {
  const { projectId } = await params;
  return <SiteInstructionsView projectId={projectId} />;
}
