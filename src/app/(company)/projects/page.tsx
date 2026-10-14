import { Suspense } from "react";
import { ProjectsBrowser } from "@/features/projects/views/ProjectsBrowser";

export default function AllProjectsPage() {
  return (
    <Suspense>
      <ProjectsBrowser
        titleKey="projects.list.allTitle"
        statuses={["DRAFT", "ACTIVE", "CLOSEOUT", "HANDED_OVER", "CLOSED", "READ_ONLY"]}
      />
    </Suspense>
  );
}
