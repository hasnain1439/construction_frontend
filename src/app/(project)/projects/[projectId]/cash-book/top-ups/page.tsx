import { RequireAccess } from "@/components/common/RequireAccess";
import { TopupsView } from "@/features/cashbook/views/CashViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/cash-book/top-ups">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="cashbook.topup.view">
      <TopupsView projectId={projectId} />
    </RequireAccess>
  );
}
