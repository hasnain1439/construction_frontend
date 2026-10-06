import { MeasurementsView } from "@/features/labor/views/MoneyViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/labor/measurements">) {
  const { projectId } = await params;
  return <MeasurementsView projectId={projectId} />;
}
