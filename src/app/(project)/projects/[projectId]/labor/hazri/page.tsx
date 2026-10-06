import { HazriView } from "@/features/labor/views/TeamViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/hazri">) {
  const { projectId } = await params;
  return <HazriView projectId={projectId} />;
}
