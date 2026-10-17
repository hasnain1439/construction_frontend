import { RequireAccess } from "@/components/common/RequireAccess";
import { DelayAnalysisView } from "@/features/control/views/DelayAnalysisView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/control/delay">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="control.view">
      <DelayAnalysisView projectId={projectId} />
    </RequireAccess>
  );
}
