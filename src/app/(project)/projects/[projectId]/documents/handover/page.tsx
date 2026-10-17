import { RequireAccess } from "@/components/common/RequireAccess";
import { HandoverView } from "@/features/closeout/HandoverView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/handover">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="closeout.handover.manage">
      <HandoverView projectId={projectId} />
    </RequireAccess>
  );
}
