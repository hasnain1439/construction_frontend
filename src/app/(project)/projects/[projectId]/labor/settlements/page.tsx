import { SettlementsView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/settlements">) {
  const { projectId } = await params;
  return <SettlementsView projectId={projectId} />;
}
