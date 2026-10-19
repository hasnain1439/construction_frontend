import { RequireAccess } from "@/components/common/RequireAccess";
import { PeshgiView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/peshgi">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="labor.advance.view">
      <PeshgiView projectId={projectId} />
    </RequireAccess>
  );
}
