import { CashCountsView } from "@/features/cashbook/views/CashViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/cash-book/counts">) {
  const { projectId } = await params;
  return <CashCountsView projectId={projectId} />;
}
