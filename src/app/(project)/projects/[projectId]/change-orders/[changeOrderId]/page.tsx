import { ChangeOrderDetailView } from "@/features/change-orders/ChangeOrderDetailView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders/[changeOrderId]">) {
  const { projectId, changeOrderId } = await params;
  return <ChangeOrderDetailView projectId={projectId} changeOrderId={changeOrderId} />;
}
