import { redirect } from "next/navigation";
import { projectHref } from "@/lib/navigation";

/** `/projects/:id` → Project Summary. */
export default async function ProjectIndex({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  redirect(projectHref(projectId, "/overview"));
}
