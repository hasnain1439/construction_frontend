import { AppShell } from "@/components/layout/AppShell";

export default function ProjectLayout({ children }: LayoutProps<"/projects/[projectId]">) {
  return <AppShell mode="project">{children}</AppShell>;
}
