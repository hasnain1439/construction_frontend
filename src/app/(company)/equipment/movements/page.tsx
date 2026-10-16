import { RequireAccess } from "@/components/common/RequireAccess";
import { MovementsView } from "@/features/equipment/views/MovementViews";

export default function Page() {
  return (
    <RequireAccess permission="equipment.view">
      <MovementsView />
    </RequireAccess>
  );
}
