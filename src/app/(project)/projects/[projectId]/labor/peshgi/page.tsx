import { PeshgiView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/peshgi">) {
  const { projectId } = await params;
  return <PeshgiView projectId={projectId} />;
}
