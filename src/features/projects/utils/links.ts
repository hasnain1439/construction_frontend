import type { ProjectStatus } from "@/api/types";
import { projectHref } from "@/lib/navigation";

/** Where a project opens: drafts continue in the wizard, others in Project mode. */
export function projectLanding(project: { id: string; status: ProjectStatus }): string {
  return project.status === "DRAFT" ? wizardHref(project.id) : projectHref(project.id, "/overview");
}

/** The wizard for an existing project, optionally on a given tab. */
export function wizardHref(projectId: string, tab?: number): string {
  return projectHref(projectId, `/edit${tab ? `?tab=${tab}` : ""}`);
}
