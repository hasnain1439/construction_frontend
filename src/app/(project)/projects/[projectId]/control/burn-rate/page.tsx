import { RequireAccess } from "@/components/common/RequireAccess";
import { BurnRateView } from "@/features/control/views/BurnRateView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/control/burn-rate">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="control.view">
      <BurnRateView projectId={projectId} />
    </RequireAccess>
  );
}
