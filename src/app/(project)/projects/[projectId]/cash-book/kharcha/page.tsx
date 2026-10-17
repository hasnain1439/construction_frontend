import { RequireAccess } from "@/components/common/RequireAccess";
import { KharchaView } from "@/features/cashbook/views/CashViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/cash-book/kharcha">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="cashbook.expense.view">
      <KharchaView projectId={projectId} />
    </RequireAccess>
  );
}
