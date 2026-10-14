"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { DemoBadge } from "@/features/onboarding/components/DemoBadge";
import Link from "next/link";
import type { ProjectListItem } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { projectLanding } from "../utils/links";

/** Project tile for the cards view of All Projects. */
export function ProjectCard({ project, showMoney }: { project: ProjectListItem; showMoney: boolean }) {
  const t = useT();
  const te = useEnumT();
  return (
    <Link
      href={projectLanding(project)}
      className="group flex flex-col gap-4 rounded-3xl border glass p-5 shadow-card transition-[border-color,box-shadow] hover:border-sand/60 hover:shadow-flyout"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold group-hover:text-primary">{project.name}</p>
          <p className="text-xs text-muted-foreground">
            {project.code}
            {project.client ? ` · ${project.client.name}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge domain="project" value={project.status} />
          <DemoBadge isDemo={project.isDemo} />
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{[project.siteAddress, project.city].filter(Boolean).join(", ") || t("projects.list.noAddress")}</span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <bdi>
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
          </bdi>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {project.contractType ? <StatusBadge tone="info" label={te("projectContractType", project.contractType)} /> : null}
        {project.coveredAreaSqft ? (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {t("projects.unit.sqftValue", { n: project.coveredAreaSqft.toLocaleString("en-PK") })}
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
        {project.pm ? (
          <AvatarName name={project.pm.name} subtitle={t("projects.list.pm")} size="sm" />
        ) : (
          <span className="text-xs text-muted-foreground">{t("projects.list.noPmYet")}</span>
        )}
        {showMoney ? <MoneyText paisa={project.contractValuePaisa} short className="text-sm font-semibold" /> : null}
      </div>
    </Link>
  );
}
