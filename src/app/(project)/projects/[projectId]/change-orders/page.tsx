import { ChangeOrdersView } from "@/features/change-orders/ChangeOrdersView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders">) {
  const { projectId } = await params;
  return <ChangeOrdersView projectId={projectId} />;
}
