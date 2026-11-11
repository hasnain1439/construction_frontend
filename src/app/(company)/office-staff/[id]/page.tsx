import { RequireAccess } from "@/components/common/RequireAccess";
import { StaffDetailView } from "@/features/finance/views/StaffViews";

export default async function Page({ params }: PageProps<"/office-staff/[id]">) {
  const { id } = await params;
  return (
    <RequireAccess permission="finance.staff.view">
      <StaffDetailView staffId={id} />
    </RequireAccess>
  );
}
