import { RequireAccess } from "@/components/common/RequireAccess";
import { SiteInstructionsView } from "@/features/change-orders/SiteInstructionsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders/instructions">) {
  const { projectId } = await params;
  return (
    <RequireAccess anyPermission={["changeorder.instruction.view", "changeorder.instruction.create"]}>
      <SiteInstructionsView projectId={projectId} />
    </RequireAccess>
  );
}
