import { cn } from "@/lib/cn";

/** "Projects 3 / 5" with a bar; amber at ≥ 80 %, red at the limit. `limit` null = unlimited. */
export function UsageBar({
  label,
  used,
  limit,
  hint,
  className,
}: {
  label: string;
  used: number;
  limit: number | null;
  hint?: string;
  className?: string;
}) {
  const percent = limit ? Math.min(100, (used / limit) * 100) : 0;
  const tone = limit === null ? "bg-primary" : percent >= 100 ? "bg-danger" : percent >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular">
          {used} / {limit === null ? "∞" : limit}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit ?? undefined}
      >
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${limit === null ? 8 : percent}%` }} />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
