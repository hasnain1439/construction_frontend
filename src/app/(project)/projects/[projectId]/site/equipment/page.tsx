import { RequireAccess } from "@/components/common/RequireAccess";
import { SiteEquipmentView } from "@/features/equipment/views/SiteEquipmentView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/equipment">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="equipment.view">
      <SiteEquipmentView projectId={projectId} />
    </RequireAccess>
  );
}
