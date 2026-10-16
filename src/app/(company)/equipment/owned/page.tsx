import { RequireAccess } from "@/components/common/RequireAccess";
import { OwnedEquipmentView } from "@/features/equipment/views/OwnedEquipmentViews";

export default function Page() {
  return (
    <RequireAccess permission="equipment.view">
      <OwnedEquipmentView />
    </RequireAccess>
  );
}
