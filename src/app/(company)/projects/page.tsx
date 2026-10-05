import { Suspense } from "react";
import { ProjectsBrowser } from "@/features/projects/views/ProjectsBrowser";

export default function AllProjectsPage() {
  return (
    <Suspense>
      <ProjectsBrowser
        title="All Projects"
        crumb="All Projects"
        statuses={["DRAFT", "ACTIVE", "CLOSEOUT", "HANDED_OVER", "CLOSED", "READ_ONLY"]}
      />
    </Suspense>
  );
}
