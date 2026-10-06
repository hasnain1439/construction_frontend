import { FloatsView } from "@/features/cashbook/views/CashViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/cash-book/floats">) {
  const { projectId } = await params;
  return <FloatsView projectId={projectId} />;
}
