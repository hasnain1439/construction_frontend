import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InfoItem {
  label: string;
  value: ReactNode;
  /** Hide the row entirely (e.g. no permission). */
  hidden?: boolean;
}

/** Label / value grid used by detail cards (project overview, company detail …). */
export function InfoList({ items, columns = 2, className }: { items: InfoItem[]; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 1 ? "grid-cols-1" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <div key={item.label} className="min-w-0 space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="text-sm font-medium break-words text-foreground">{item.value ?? "—"}</dd>
          </div>
        ))}
    </dl>
  );
}
