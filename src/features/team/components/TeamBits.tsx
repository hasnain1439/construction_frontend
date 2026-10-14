"use client";

import type { NamedRef, Role } from "@/api/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useT } from "@/i18n/useT";

const ROLE_TONE = { THEKEDAR: "info", PM: "success", MUNSHI: "neutral" } as const;

export function RoleBadge({ role }: { role: Role }) {
  const t = useT();
  return <StatusBadge tone={ROLE_TONE[role]} label={t(`role.${role}`)} />;
}

/** Project names as chips, "+N more" after `max`. */
export function ProjectChips({ projects, all, max = 2 }: { projects: NamedRef[]; all?: boolean; max?: number }) {
  const t = useT();
  if (all) return <span className="text-sm text-muted-foreground">{t("shell.allProjects")}</span>;
  if (!projects.length) return <span className="text-sm text-muted-foreground">{t("teamCompany.bits.none")}</span>;
  const shown = projects.slice(0, max);
  const rest = projects.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1" title={projects.map((p) => p.name).join(", ")}>
      {shown.map((p) => (
        <span key={p.id} className="max-w-40 truncate rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
          {p.name}
        </span>
      ))}
      {rest > 0 ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t("teamCompany.bits.more", { n: rest })}</span> : null}
    </div>
  );
}
