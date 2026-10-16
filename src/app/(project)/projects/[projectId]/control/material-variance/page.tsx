import { RequireAccess } from "@/components/common/RequireAccess";
import { MaterialVarianceView } from "@/features/control/views/MaterialVarianceView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/control/material-variance">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="control.view">
      <MaterialVarianceView projectId={projectId} />
    </RequireAccess>
  );
}
