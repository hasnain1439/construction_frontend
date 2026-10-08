import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export interface KpiDelta {
  /** Text in the chip ("12%", "+3"). */
  label: ReactNode;
  direction?: "up" | "down";
  /** Defaults to success for up, danger for down. */
  tone?: "success" | "danger" | "neutral";
}

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Small line under the number ("1 at risk · 1 delayed"). */
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
  tone?: "primary" | "success" | "warning" | "danger";
  /**
   * "card" (default): a standalone soft card. "tile": a small rounded tile to sit inside a
   * card (KpiGroup) — number first, label under it, icon / delta chip top-right.
   */
  variant?: "card" | "tile";
  /** The one KPI that matters most: a sun-yellow tile. */
  highlight?: boolean;
  /** Tiny change chip top-right (↑ / ↓). */
  delta?: KpiDelta;
}

const toneClass = {
  primary: "bg-sun-soft text-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

const chipToneClass = {
  primary: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

function DeltaChip({ delta, onSun }: { delta: KpiDelta; onSun?: boolean }) {
  const tone = delta.tone ?? (delta.direction === "down" ? "danger" : delta.direction === "up" ? "success" : "neutral");
  const Arrow = delta.direction === "down" ? ArrowDown : delta.direction === "up" ? ArrowUp : null;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full px-2 text-xs font-semibold tabular",
        onSun ? "bg-white/45" : "kpi-chip",
        tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : onSun ? "text-charcoal" : "text-muted-foreground",
      )}
    >
      {Arrow ? <Arrow className="size-3" aria-hidden /> : null}
      {delta.label}
    </span>
  );
}

/** The card's icon, large and faint in the bottom-right corner; zooms in when the card is hovered. */
function Watermark({ icon: Icon, highlight }: { icon: LucideIcon; highlight?: boolean }) {
  return (
    <Icon
      aria-hidden
      strokeWidth={1.4}
      className={cn(
        "pointer-events-none absolute -right-5 -bottom-6 -z-10 size-32 transition-transform duration-500 ease-out group-hover:scale-125 group-hover:-rotate-6 motion-reduce:transition-none",
        highlight ? "text-charcoal/12" : "text-foreground/[0.045]",
      )}
    />
  );
}

/** KPI: big number, small label, optional icon / delta chip (design brief §6). */
export function KpiCard({ label, value, icon: Icon, hint, loading, className, tone = "primary", variant = "card", highlight, delta }: KpiCardProps) {
  if (variant === "tile") {
    return (
      <div
        data-highlight={highlight || undefined}
        className={cn("group relative isolate flex min-h-32 flex-col justify-between gap-3 overflow-hidden rounded-2xl p-4", highlight ? "bg-sand text-charcoal" : "bg-muted text-foreground", className)}
      >
        <div className="flex items-start justify-between gap-2">
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            // Not cn(): tailwind-merge would treat text-kpi (a size) and the colour as one group.
            <p className={`text-kpi font-semibold tabular ${highlight ? "text-charcoal" : "text-foreground"}`}>{value}</p>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            {delta ? <DeltaChip delta={delta} onSun={highlight} /> : null}
            {Icon ? (
              <span className={cn("flex size-8 items-center justify-center rounded-full", highlight ? "bg-white/45 text-charcoal" : cn("kpi-chip", chipToneClass[tone]))}>
                <Icon className="size-4" aria-hidden />
              </span>
            ) : null}
          </div>
        </div>
        <div className="space-y-0.5">
          <p className={cn("text-sm font-medium", highlight ? "text-charcoal" : "text-foreground")}>{label}</p>
          {hint && !loading ? <p className={cn("text-xs", highlight ? "text-charcoal/75" : "text-muted-foreground")}>{hint}</p> : null}
        </div>
        {Icon ? <Watermark icon={Icon} highlight={highlight} /> : null}
      </div>
    );
  }
  return (
    <div
      data-highlight={highlight || undefined}
      className={cn(
        "group relative isolate flex flex-col gap-3 overflow-hidden rounded-3xl border p-5 shadow-card",
        highlight ? "border-transparent bg-sand text-charcoal" : "glass text-card-foreground",
        className,
      )}
    >
      {Icon || delta ? (
        <div className="flex items-start justify-between gap-2">
          {Icon ? (
            <span className={cn("flex size-10 items-center justify-center rounded-full", highlight ? "bg-white/45 text-charcoal" : toneClass[tone])}>
              <Icon className="size-5" aria-hidden />
            </span>
          ) : (
            <span />
          )}
          {delta ? <DeltaChip delta={delta} onSun={highlight} /> : null}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className={cn("text-sm", highlight ? "text-charcoal/80" : "text-muted-foreground")}>{label}</p>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className={`text-kpi font-semibold tabular ${highlight ? "text-charcoal" : "text-foreground"}`}>{value}</p>
        )}
        {hint && !loading ? <p className={cn("text-xs", highlight ? "text-charcoal/75" : "text-muted-foreground")}>{hint}</p> : null}
      </div>
      {Icon ? <Watermark icon={Icon} highlight={highlight} /> : null}
    </div>
  );
}

/**
 * KPI row inside one soft card: tiles side by side, the first (most important) one usually
 * `highlight`ed. Pass KpiCard variant="tile" children.
 */
export function KpiGroup({ title, actions, children, className, columns = "md:grid-cols-3", ariaLabel }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; columns?: string; ariaLabel?: string }) {
  return (
    <section aria-label={ariaLabel} className={cn("min-w-0 rounded-3xl border glass p-4 text-card-foreground shadow-card sm:p-5", className)}>
      {title || actions ? (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          {title ? <h2 className="text-[17px] font-semibold leading-6">{title}</h2> : <span />}
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("grid gap-3", columns)}>{children}</div>
    </section>
  );
}
