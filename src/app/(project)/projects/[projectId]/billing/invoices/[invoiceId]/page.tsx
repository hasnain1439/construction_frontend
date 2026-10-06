import { RequireAccess } from "@/components/common/RequireAccess";
import { InvoiceDetailView } from "@/features/billing/views/BillingViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/billing/invoices/[invoiceId]">) {
  const { projectId, invoiceId } = await params;
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]} permission="billing.view">
      <InvoiceDetailView projectId={projectId} invoiceId={invoiceId} />
    </RequireAccess>
  );
}
