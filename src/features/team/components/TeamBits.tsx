import type { NamedRef, Role } from "@/api/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ROLE_LABEL } from "@/lib/options";

const ROLE_TONE = { THEKEDAR: "info", PM: "success", MUNSHI: "neutral" } as const;

export function RoleBadge({ role }: { role: Role }) {
  return <StatusBadge tone={ROLE_TONE[role]} label={ROLE_LABEL[role]} />;
}

/** Project names as chips, "+N more" after `max`. */
export function ProjectChips({ projects, all, max = 2 }: { projects: NamedRef[]; all?: boolean; max?: number }) {
  if (all) return <span className="text-sm text-muted-foreground">All projects</span>;
  if (!projects.length) return <span className="text-sm text-muted-foreground">None</span>;
  const shown = projects.slice(0, max);
  const rest = projects.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1" title={projects.map((p) => p.name).join(", ")}>
      {shown.map((p) => (
        <span key={p.id} className="max-w-40 truncate rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
          {p.name}
        </span>
      ))}
      {rest > 0 ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">+{rest} more</span> : null}
    </div>
  );
}
