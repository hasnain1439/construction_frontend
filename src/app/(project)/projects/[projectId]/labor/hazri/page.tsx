import { RequireAccess } from "@/components/common/RequireAccess";
import { HazriView } from "@/features/labor/views/TeamViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/hazri">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="labor.attendance.view">
      <HazriView projectId={projectId} />
    </RequireAccess>
  );
}
