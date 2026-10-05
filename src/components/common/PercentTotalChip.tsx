import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";

/** Sum of stage percentages rounded to 2 dp (avoids 99.99999 float noise). */
export function percentTotal(values: Array<number | null | undefined>): number {
  return Math.round(values.reduce<number>((sum, v) => sum + (Number.isFinite(v) ? Number(v) : 0), 0) * 100) / 100;
}

/** Live "100% ✓" / "95% — must be 100%" chip for payment schedules. */
export function PercentTotalChip({ total, className }: { total: number; className?: string }) {
  const ok = total === 100;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular",
        ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
        className,
      )}
    >
      {ok ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
      {ok ? "100% ✓" : `${total}% — must be 100%`}
    </span>
  );
}
