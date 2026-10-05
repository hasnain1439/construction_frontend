import { IncomingView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/incoming">) {
  const { projectId } = await params;
  return <IncomingView projectId={projectId} />;
}
