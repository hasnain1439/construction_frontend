import { RequireAccess } from "@/components/common/RequireAccess";
import { ShutteringDemandView } from "@/features/equipment/views/ShutteringDemandView";

export default function Page() {
  return (
    <RequireAccess permission="equipment.view">
      <ShutteringDemandView />
    </RequireAccess>
  );
}
