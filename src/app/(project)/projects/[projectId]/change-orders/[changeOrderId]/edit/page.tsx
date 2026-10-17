import { RequireAccess } from "@/components/common/RequireAccess";
import { ChangeOrderBuilderView } from "@/features/change-orders/ChangeOrderBuilder";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders/[changeOrderId]/edit">) {
  const { projectId, changeOrderId } = await params;
  return (
    <RequireAccess permission="changeorder.edit">
      <ChangeOrderBuilderView projectId={projectId} changeOrderId={changeOrderId} />
    </RequireAccess>
  );
}
