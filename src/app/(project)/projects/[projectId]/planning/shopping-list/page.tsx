import { ShoppingListView } from "@/features/estimates/ShoppingListView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/shopping-list">) {
  const { projectId } = await params;
  return <ShoppingListView projectId={projectId} />;
}
