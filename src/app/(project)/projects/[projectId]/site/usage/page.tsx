import { UsageView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/usage">) {
  const { projectId } = await params;
  return <UsageView projectId={projectId} />;
}
