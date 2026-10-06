import { RequireAccess } from "@/components/common/RequireAccess";
import { StatementView } from "@/features/billing/views/BillingViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/billing/statement">) {
  const { projectId } = await params;
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]} permission="billing.view">
      <StatementView projectId={projectId} />
    </RequireAccess>
  );
}
