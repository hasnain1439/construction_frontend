import { RequireAccess } from "@/components/common/RequireAccess";
import { EquipmentDetailView } from "@/features/equipment/views/OwnedEquipmentViews";

export default async function Page({ params }: PageProps<"/equipment/owned/[equipmentId]">) {
  const { equipmentId } = await params;
  return (
    <RequireAccess permission="equipment.view">
      <EquipmentDetailView equipmentId={equipmentId} />
    </RequireAccess>
  );
}
