import { notFound } from "next/navigation";
import { ReceiveView } from "@/features/site/SiteViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/site/incoming/[kind]/[docId]">) {
  const { projectId, kind, docId } = await params;
  if (kind !== "dispatch" && kind !== "purchase") notFound();
  return <ReceiveView projectId={projectId} kind={kind} docId={docId} />;
}
