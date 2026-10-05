import { FloorsRoomsView } from "@/features/projects/views/ProjectModeViews";

export default async function Page({ params }: PageProps<"/projects/[projectId]/planning/floors-rooms">) {
  const { projectId } = await params;
  return <FloorsRoomsView projectId={projectId} />;
}
