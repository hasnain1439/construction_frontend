"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useGetProjectQuery } from "@/api/services/projects.api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

/** Top of the rail in project mode: "← All projects", project name + status badge. */
export function ProjectRailHeader({ projectId, collapsed }: { projectId: string; collapsed?: boolean }) {
  const t = useT();
  const te = useEnumT();
  const { data: project, isLoading } = useGetProjectQuery(projectId);
  return (
    <div className={cn("space-y-2 border-b border-sidebar-border px-2 py-3", collapsed && "px-1")}>
      <Link
        href="/projects"
        className="flex items-center justify-center gap-1 rounded-full px-1 py-1.5 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent"
        aria-label={t("shell.allProjects")}
      >
        <ArrowLeft className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden />
        {collapsed ? null : <span>{t("shell.allProjects")}</span>}
      </Link>
      {collapsed ? null : isLoading ? (
        <div className="space-y-1.5 px-1">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-5 w-16" />
        </div>
      ) : project ? (
        <div className="space-y-1.5 px-1 text-center">
          <p className="line-clamp-3 text-xs leading-snug font-semibold" title={project.name}>
            {project.name}
          </p>
          <StatusBadge domain="project" value={project.status} label={te("projectStatus", project.status)} className="h-5 px-2 text-[11px]" />
        </div>
      ) : null}
    </div>
  );
}
