import { ChangeOrderBuilderView } from "@/features/change-orders/ChangeOrderBuilder";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders/[changeOrderId]/edit">) {
  const { projectId, changeOrderId } = await params;
  return <ChangeOrderBuilderView projectId={projectId} changeOrderId={changeOrderId} />;
}
