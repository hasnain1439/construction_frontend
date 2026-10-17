import { RequireAccess } from "@/components/common/RequireAccess";
import { SiteStockView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/stock">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="inventory.stock.view">
      <SiteStockView projectId={projectId} />
    </RequireAccess>
  );
}
