import { RetentionView } from "@/features/closeout/RetentionView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/retention">) {
  const { projectId } = await params;
  return <RetentionView projectId={projectId} />;
}
