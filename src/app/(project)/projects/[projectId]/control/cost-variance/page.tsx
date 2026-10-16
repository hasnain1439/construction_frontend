import { RequireAccess } from "@/components/common/RequireAccess";
import { CostVarianceView } from "@/features/control/views/CostVarianceView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/control/cost-variance">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="control.view">
      <CostVarianceView projectId={projectId} />
    </RequireAccess>
  );
}
