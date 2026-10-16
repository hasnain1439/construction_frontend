import { DrawingsView } from "@/features/closeout/DrawingsView";

export default async function Page({ params }: PageProps<"/projects/[projectId]/documents/drawings">) {
  const { projectId } = await params;
  return <DrawingsView projectId={projectId} />;
}
