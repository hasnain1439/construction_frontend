import { RequireAccess } from "@/components/common/RequireAccess";
import { WorkerDetailView } from "@/features/labor/views/WorkforceDetailViews";

export default async function Page({ params }: PageProps<"/workforce/workers/[workerId]">) {
  const { workerId } = await params;
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <WorkerDetailView workerId={workerId} />
    </RequireAccess>
  );
}
