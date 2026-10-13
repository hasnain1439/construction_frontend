import { RequireAccess } from "@/components/common/RequireAccess";
import { SubcontractorDetailView } from "@/features/labor/views/WorkforceDetailViews";

export default async function Page({ params }: PageProps<"/workforce/subcontractors/[subcontractorId]">) {
  const { subcontractorId } = await params;
  return (
    <RequireAccess allPermissions={["masterdata.subcontractor.view", "labor.account.view"]}>
      <SubcontractorDetailView subcontractorId={subcontractorId} />
    </RequireAccess>
  );
}
