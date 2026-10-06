import { cn } from "@/lib/cn";

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

/**
 * "% billed" next to "% spent" of the contract as two thin bars with the numbers written out.
 * Spent running ahead of billed (own money going in) turns the spent bar amber.
 */
export function ProgressPair({ billed, spent, className }: { billed: number; spent: number; className?: string }) {
  const ahead = spent > billed;
  return (
    <div className={cn("min-w-32 space-y-1", className)} aria-label={`${billed}% billed, ${spent}% spent`}>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-12 text-muted-foreground">Billed</span>
        <span className="h-1.5 flex-1 rounded-full bg-muted">
          <span className="block h-full rounded-full bg-chart-1" style={{ width: `${clamp(billed)}%` }} />
        </span>
        <span className="w-10 text-right tabular">{billed}%</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-12 text-muted-foreground">Spent</span>
        <span className="h-1.5 flex-1 rounded-full bg-muted">
          <span className={cn("block h-full rounded-full", ahead ? "bg-warning" : "bg-chart-3")} style={{ width: `${clamp(spent)}%` }} />
        </span>
        <span className="w-10 text-right tabular">{spent}%</span>
      </div>
    </div>
  );
}
