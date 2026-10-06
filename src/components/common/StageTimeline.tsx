import { Check, CircleDashed, Clock, Flag, Hourglass } from "lucide-react";
import Link from "next/link";
import type { StageStatus } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";

export interface TimelineStageItem {
  id: string;
  label: string;
  percent: number;
  amountPaisa: string;
  status: StageStatus;
  isRetention?: boolean;
  expectedDate?: string | null;
  invoiceNumber?: string | null;
  invoiceHref?: string | null;
  dueDate?: string | null;
}

const META: Record<StageStatus, { icon: typeof Check; dot: string; label: string }> = {
  UPCOMING: { icon: CircleDashed, dot: "border border-dashed bg-card text-muted-foreground", label: "Upcoming" },
  READY: { icon: Flag, dot: "bg-primary text-primary-foreground", label: "Ready to bill" },
  INVOICED: { icon: Clock, dot: "bg-warning text-white", label: "Invoiced" },
  PARTLY_PAID: { icon: Hourglass, dot: "bg-warning text-white", label: "Part paid" },
  PAID: { icon: Check, dot: "bg-success text-white", label: "Paid" },
};

/**
 * Payment schedule as a horizontal timeline: % and amount per stage, status icon, invoice
 * link and due date. Scrolls sideways on phones.
 */
export function StageTimeline({ stages, className }: { stages: TimelineStageItem[]; className?: string }) {
  return (
    <ol className={cn("flex gap-0 overflow-x-auto pb-2 scrollbar-slim", className)} aria-label="Payment schedule">
      {stages.map((s, i) => {
        const meta = META[s.status];
        const Icon = meta.icon;
        const done = s.status === "PAID";
        return (
          <li key={s.id} className="relative flex min-w-36 flex-1 flex-col items-center px-2 text-center" data-status={s.status}>
            {i < stages.length - 1 ? <span className={cn("absolute top-4 left-1/2 h-0.5 w-full", done ? "bg-success" : "bg-border")} aria-hidden /> : null}
            <span className={cn("relative z-10 flex size-8 items-center justify-center rounded-full", meta.dot)}>
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{meta.label}</span>
            </span>
            <p className="mt-2 line-clamp-2 text-xs font-medium">{s.label}</p>
            <p className="text-xs text-muted-foreground tabular">
              {s.percent}% · {formatPKRShort(s.amountPaisa)}
            </p>
            {s.invoiceNumber ? (
              s.invoiceHref ? (
                <Link href={s.invoiceHref} className="text-xs text-primary underline-offset-4 hover:underline">
                  {s.invoiceNumber}
                </Link>
              ) : (
                <span className="text-xs">{s.invoiceNumber}</span>
              )
            ) : null}
            {s.dueDate && s.status !== "PAID" ? <p className="text-[11px] text-muted-foreground">Due {formatDate(s.dueDate)}</p> : null}
            {!s.invoiceNumber && s.expectedDate ? <p className="text-[11px] text-muted-foreground">Expected {formatDate(s.expectedDate)}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
