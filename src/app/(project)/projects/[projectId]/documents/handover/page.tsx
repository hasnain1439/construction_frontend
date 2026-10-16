import { HandoverView } from "@/features/closeout/HandoverView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/handover">) {
  const { projectId } = await params;
  return <HandoverView projectId={projectId} />;
}
