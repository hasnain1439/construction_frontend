import { RequireAccess } from "@/components/common/RequireAccess";
import { SettlementsView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/settlements">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="labor.settlement.view">
      <SettlementsView projectId={projectId} />
    </RequireAccess>
  );
}
