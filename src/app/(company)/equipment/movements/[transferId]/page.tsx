import { RequireAccess } from "@/components/common/RequireAccess";
import { TransferDetailView } from "@/features/equipment/views/MovementViews";

export default async function Page({ params }: PageProps<"/equipment/movements/[transferId]">) {
  const { transferId } = await params;
  return (
    <RequireAccess permission="equipment.view">
      <TransferDetailView transferId={transferId} />
    </RequireAccess>
  );
}
