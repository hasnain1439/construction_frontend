import { Clock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Placeholder KPI / widget for a module that arrives in a later phase (no fake numbers). */
export function ComingSoonCard({
  title,
  description,
  icon: Icon = Clock,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-dashed bg-card/60 p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">Next phase</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description ?? "Coming in the next phase."}</p>
      </div>
    </div>
  );
}
