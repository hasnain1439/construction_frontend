import { Check, CircleDashed, Clock, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";

export interface TimelineStep {
  label: string;
  state: "done" | "current" | "pending" | "returned" | "rejected";
  at?: string | null;
  by?: string | null;
  note?: string | null;
}

const ICON = { done: Check, current: Clock, pending: CircleDashed, returned: Undo2, rejected: X } as const;
const TONE = {
  done: "bg-success text-white",
  current: "bg-warning text-white",
  pending: "border border-dashed bg-card text-muted-foreground",
  returned: "bg-warning-soft text-warning",
  rejected: "bg-danger text-white",
} as const;

/** Vertical steps (Created → Submitted → Approved → Paid) with who / when. */
export function StatusTimeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn("space-y-0", className)} aria-label="Status history">
      {steps.map((s, i) => {
        const Icon = ICON[s.state];
        return (
          <li key={`${s.label}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 ? <span className="absolute top-7 left-3.5 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden /> : null}
            <span className={cn("relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full", TONE[s.state])}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5 text-sm">
              <p className={cn("font-medium", s.state === "pending" && "text-muted-foreground")}>{s.label}</p>
              {s.at || s.by ? (
                <p className="text-xs text-muted-foreground">
                  {s.by ? `${s.by}` : null}
                  {s.by && s.at ? " · " : null}
                  {s.at ? formatDateTime(s.at) : null}
                </p>
              ) : null}
              {s.note ? <p className="mt-1 rounded-md bg-muted px-2 py-1 text-xs">“{s.note}”</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
