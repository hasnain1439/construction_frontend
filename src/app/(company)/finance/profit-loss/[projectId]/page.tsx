import { RequireAccess } from "@/components/common/RequireAccess";
import { ProjectProfitView } from "@/features/finance/views/FinanceViews";

export default async function Page({ params }: PageProps<"/finance/profit-loss/[projectId]">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="finance.pnl.view">
      <ProjectProfitView projectId={projectId} />
    </RequireAccess>
  );
}
