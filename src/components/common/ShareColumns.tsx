import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ShareItem {
  key: string;
  label: ReactNode;
  /** Plotted size (any unit — only the ratios matter). */
  value: number;
  /** What the legend writes (e.g. "Rs 4.5 L"). */
  display: ReactNode;
  hint?: ReactNode;
}

const pct = (value: number, total: number) =>
  total > 0 ? Math.round((Math.max(0, value) / total) * 100) : 0;

/**
 * Parts of a whole as wide rounded columns, biggest first: each sits on a faint full-height
 * track with its share written at the top, and a legend beside it repeats label, share and
 * value (so nothing is read from colour or height alone). One series → the brand sand.
 */
export function ShareColumns({
  items,
  ariaLabel,
  className,
  empty = "Nothing yet",
}: {
  items: ShareItem[];
  ariaLabel: string;
  className?: string;
  empty?: ReactNode;
}) {
  const shown = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = shown.reduce((sum, i) => sum + i.value, 0);
  const max = shown[0]?.value ?? 0;
  if (!shown.length || max <= 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    // Side-by-side only when the card itself is wide enough (container query, not the viewport).
    <div className={cn("@container", className)}>
      <div className="flex flex-col gap-5 @lg:flex-row @lg:items-stretch">
        <div className="flex h-44 min-w-0 flex-1 items-end gap-1.5" aria-hidden>
          {shown.map((item) => {
            const share = pct(item.value, total);
            return (
              <div
                key={item.key}
                className="group relative h-full min-w-0 flex-1 overflow-hidden rounded-2xl bg-muted"
                title={`${share}%`}
              >
                <span className="tabular absolute inset-x-0 top-2 z-10 text-center text-[11px] font-semibold text-muted-foreground">
                  {share}%
                </span>
                <div
                  className="absolute inset-x-0 bottom-0 origin-bottom animate-column-grow rounded-2xl bg-chart-brand transition-[filter] group-hover:brightness-90 motion-reduce:animate-none"
                  style={{ height: `${Math.max(6, (item.value / max) * 82)}%` }}
                />
              </div>
            );
          })}
        </div>
        <ul
          className="grid content-center gap-x-6 gap-y-2.5 text-sm @lg:w-60 @lg:shrink-0"
          aria-label={ariaLabel}
        >
          {shown.map((item) => (
            <li key={item.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{item.label}</span>
                <span className="tabular shrink-0 text-xs font-semibold text-muted-foreground">
                  {pct(item.value, total)}%
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{item.hint}</span>
                <span className="tabular shrink-0">{item.display}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
