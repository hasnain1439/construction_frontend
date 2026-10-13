import { RequireAccess } from "@/components/common/RequireAccess";
import { PaymentsView } from "@/features/billing/views/BillingViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/billing/payments">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="billing.payment.view">
      <PaymentsView projectId={projectId} />
    </RequireAccess>
  );
}
