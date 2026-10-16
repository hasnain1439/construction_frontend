import { SnagsView } from "@/features/closeout/SnagsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/snags">) {
  const { projectId } = await params;
  return <SnagsView projectId={projectId} />;
}
