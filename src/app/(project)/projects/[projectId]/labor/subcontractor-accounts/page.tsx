import { RequireAccess } from "@/components/common/RequireAccess";
import { SubcontractAccountsView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/subcontractor-accounts">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="labor.account.view">
      <SubcontractAccountsView projectId={projectId} />
    </RequireAccess>
  );
}
