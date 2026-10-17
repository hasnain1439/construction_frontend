import { RequireAccess } from "@/components/common/RequireAccess";
import { ChangeOrderDetailView } from "@/features/change-orders/ChangeOrderDetailView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders/[changeOrderId]">) {
  const { projectId, changeOrderId } = await params;
  return (
    <RequireAccess permission="changeorder.view">
      <ChangeOrderDetailView projectId={projectId} changeOrderId={changeOrderId} />
    </RequireAccess>
  );
}
