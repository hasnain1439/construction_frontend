import { DeliveriesView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/deliveries">) {
  const { projectId } = await params;
  return <DeliveriesView projectId={projectId} />;
}
