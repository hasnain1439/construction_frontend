import { RequireAccess } from "@/components/common/RequireAccess";
import { RentalsView } from "@/features/equipment/views/RentalViews";

export default function Page() {
  return (
    <RequireAccess permission="equipment.view">
      <RentalsView />
    </RequireAccess>
  );
}
