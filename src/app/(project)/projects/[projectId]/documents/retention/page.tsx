import { RequireAccess } from "@/components/common/RequireAccess";
import { RetentionView } from "@/features/closeout/RetentionView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/retention">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="closeout.retention.view">
      <RetentionView projectId={projectId} />
    </RequireAccess>
  );
}
