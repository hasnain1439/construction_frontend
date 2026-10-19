import { RequireAccess } from "@/components/common/RequireAccess";
import { DeliveriesView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/deliveries">) {
  const { projectId } = await params;
  return (
    <RequireAccess anyPermission={["inventory.ownerdelivery.view", "procurement.purchase.view"]}>
      <DeliveriesView projectId={projectId} />
    </RequireAccess>
  );
}
