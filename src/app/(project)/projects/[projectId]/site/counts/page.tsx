import { CountsView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/counts">) {
  const { projectId } = await params;
  return <CountsView projectId={projectId} />;
}
