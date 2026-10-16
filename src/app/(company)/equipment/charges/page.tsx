import { RequireAccess } from "@/components/common/RequireAccess";
import { ChargesView } from "@/features/equipment/views/LossChargeViews";

export default function Page() {
  return (
    <RequireAccess permission="equipment.view">
      <ChargesView />
    </RequireAccess>
  );
}
