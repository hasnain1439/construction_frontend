import { Suspense } from "react";
import { ProjectsBrowser } from "@/features/projects/views/ProjectsBrowser";

export default function ClosedProjectsPage() {
  return (
    <Suspense>
      <ProjectsBrowser
        titleKey="projects.list.closedTitle"
        statuses={["HANDED_OVER", "CLOSED"]}
        defaultStatus="HANDED_OVER"
        allowAllStatuses={false}
      />
    </Suspense>
  );
}
