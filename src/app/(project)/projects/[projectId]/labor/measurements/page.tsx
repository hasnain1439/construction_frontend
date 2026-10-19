import { RequireAccess } from "@/components/common/RequireAccess";
import { MeasurementsView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/measurements">) {
  const { projectId } = await params;
  return (
    <RequireAccess permission="labor.measurement.view">
      <MeasurementsView projectId={projectId} />
    </RequireAccess>
  );
}
