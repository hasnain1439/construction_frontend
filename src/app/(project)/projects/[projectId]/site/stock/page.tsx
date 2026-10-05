import { SiteStockView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/stock">) {
  const { projectId } = await params;
  return <SiteStockView projectId={projectId} />;
}
