import { RequireAccess } from "@/components/common/RequireAccess";
import { ChangeOrdersView } from "@/features/change-orders/ChangeOrdersView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="changeorder.view">
      <ChangeOrdersView projectId={projectId} />
    </RequireAccess>
  );
}
