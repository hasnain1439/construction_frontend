import { RequireAccess } from "@/components/common/RequireAccess";
import { RentalDetailView } from "@/features/equipment/views/RentalViews";

export default async function Page({ params }: PageProps<"/equipment/rentals/[rentalId]">) {
  const { rentalId } = await params;
  return (
    <RequireAccess permission="equipment.view">
      <RentalDetailView rentalId={rentalId} />
    </RequireAccess>
  );
}
