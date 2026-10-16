import { RequireAccess } from "@/components/common/RequireAccess";
import { LossDamageView } from "@/features/equipment/views/LossChargeViews";

export default function Page() {
  return (
    <RequireAccess permission="equipment.view">
      <LossDamageView />
    </RequireAccess>
  );
}
