import { Suspense } from "react";
import { NewPurchaseView } from "@/features/procurement/views/NewPurchaseView";

/** Site purchase entered from project mode (MUNSHI: no rates; office: rates + payment). */
export default async function Page({ params }: PageProps<"/projects/[projectId]/site/deliveries/purchase">) {
  const { projectId } = await params;
  return (
    <Suspense>
      <NewPurchaseView fixedProjectId={projectId} backHref={`/projects/${projectId}/site/deliveries`} />
    </Suspense>
  );
}
