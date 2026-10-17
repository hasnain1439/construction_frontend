import { RequireAccess } from "@/components/common/RequireAccess";
import { SnagsView } from "@/features/closeout/SnagsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/snags">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="closeout.snag.view">
      <SnagsView projectId={projectId} />
    </RequireAccess>
  );
}
