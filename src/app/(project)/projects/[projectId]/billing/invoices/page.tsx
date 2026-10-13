import { RequireAccess } from "@/components/common/RequireAccess";
import { InvoicesView } from "@/features/billing/views/BillingViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/billing/invoices">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="billing.invoice.view">
      <InvoicesView projectId={projectId} />
    </RequireAccess>
  );
}
