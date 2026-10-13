import { RequireAccess } from "@/components/common/RequireAccess";
import { WorkerDetailView } from "@/features/labor/views/WorkforceDetailViews";

export default async function Page({ params }: PageProps<"/workforce/workers/[workerId]">) {
  const { workerId } = await params;
  return (
    <RequireAccess allPermissions={["masterdata.worker.view", "labor.account.view"]}>
      <WorkerDetailView workerId={workerId} />
    </RequireAccess>
  );
}
