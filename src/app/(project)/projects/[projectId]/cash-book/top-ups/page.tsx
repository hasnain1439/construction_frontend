import { TopupsView } from "@/features/cashbook/views/CashViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/cash-book/top-ups">) {
  const { projectId } = await params;
  return <TopupsView projectId={projectId} />;
}
