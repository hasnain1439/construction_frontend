import { ChangeOrderBuilderView } from "@/features/change-orders/ChangeOrderBuilder";

export default async function Page({ params }: PageProps<"/projects/[projectId]/change-orders/new">) {
  const { projectId } = await params;
  return <ChangeOrderBuilderView projectId={projectId} />;
}
