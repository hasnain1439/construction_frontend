import { RequireAccess } from "@/components/common/RequireAccess";
import { ShoppingListView } from "@/features/estimates/ShoppingListView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/shopping-list">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="projects.estimate.view">
      <ShoppingListView projectId={projectId} />
    </RequireAccess>
  );
}
