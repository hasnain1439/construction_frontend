import { SettlementDetailView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/settlements/[settlementId]">) {
  const { projectId, settlementId } = await params;
  return <SettlementDetailView projectId={projectId} settlementId={settlementId} />;
}
