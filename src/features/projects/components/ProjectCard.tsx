import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import type { ProjectListItem } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate } from "@/lib/dates";
import { CONTRACT_TYPE_LABEL } from "../constants";
import { projectLanding } from "../utils/links";

/** Project tile for the cards view of All Projects. */
export function ProjectCard({ project, showMoney }: { project: ProjectListItem; showMoney: boolean }) {
  return (
    <Link
      href={projectLanding(project)}
      className="group flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold group-hover:text-primary">{project.name}</p>
          <p className="text-xs text-muted-foreground">
            {project.code}
            {project.client ? ` · ${project.client.name}` : ""}
          </p>
        </div>
        <StatusBadge domain="project" value={project.status} />
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{[project.siteAddress, project.city].filter(Boolean).join(", ") || "No address yet"}</span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {formatDate(project.startDate)} – {formatDate(project.endDate)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {project.contractType ? <StatusBadge tone="info" label={CONTRACT_TYPE_LABEL[project.contractType]} /> : null}
        {project.coveredAreaSqft ? (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{project.coveredAreaSqft.toLocaleString("en-PK")} sq ft</span>
        ) : null}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
        {project.pm ? <AvatarName name={project.pm.name} subtitle="PM" size="sm" /> : <span className="text-xs text-muted-foreground">No PM yet</span>}
        {showMoney ? <MoneyText paisa={project.contractValuePaisa} short className="text-sm font-semibold" /> : null}
      </div>
    </Link>
  );
}
