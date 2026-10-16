import { RequireAccess } from "@/components/common/RequireAccess";
import { AllocationMapView } from "@/features/equipment/views/AllocationMapView";

export default function Page() {
  return (
    <RequireAccess permission="equipment.view">
      <AllocationMapView />
    </RequireAccess>
  );
}
