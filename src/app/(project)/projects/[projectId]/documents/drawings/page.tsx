import { RequireAccess } from "@/components/common/RequireAccess";
import { DrawingsView } from "@/features/closeout/DrawingsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/drawings">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="closeout.drawing.view">
      <DrawingsView projectId={projectId} />
    </RequireAccess>
  );
}
