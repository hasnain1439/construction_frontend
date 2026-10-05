import { RequireAccess } from "@/components/common/RequireAccess";
import { DispatchDetailView } from "@/features/procurement/views/DispatchViews";

export default async function Page({ params }: PageProps<"/suppliers-stock/dispatches/[dispatchId]">) {
  const { dispatchId } = await params;
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <DispatchDetailView dispatchId={dispatchId} />
    </RequireAccess>
  );
}
