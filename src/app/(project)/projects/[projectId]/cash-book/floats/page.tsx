import { RequireAccess } from "@/components/common/RequireAccess";
import { FloatsView } from "@/features/cashbook/views/CashViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/cash-book/floats">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="cashbook.account.view">
      <FloatsView projectId={projectId} />
    </RequireAccess>
  );
}
