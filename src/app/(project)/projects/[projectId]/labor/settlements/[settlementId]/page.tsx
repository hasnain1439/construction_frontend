import { RequireAccess } from "@/components/common/RequireAccess";
import { SettlementDetailView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/settlements/[settlementId]">) {
  const { projectId, settlementId } = await params;
  return (
    <RequireAccess permission="labor.settlement.view">
      <SettlementDetailView projectId={projectId} settlementId={settlementId} />
    </RequireAccess>
  );
}
