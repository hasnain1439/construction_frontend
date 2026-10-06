"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { addDays, currentWeekStart, formatWeekRange, type WeekDayName } from "@/lib/weeks";

/**
 * Previous / next week with the range in the middle. Future weeks are not reachable
 * (`allowFuture` lifts that); "This week" jumps back.
 */
export function WeekPicker({
  value,
  onChange,
  weekStartDay = "MONDAY",
  allowFuture,
  className,
}: {
  /** First day of the selected week ("YYYY-MM-DD"). */
  value: string;
  onChange: (weekStart: string) => void;
  weekStartDay?: WeekDayName;
  allowFuture?: boolean;
  className?: string;
}) {
  const thisWeek = currentWeekStart(weekStartDay);
  const atLatest = !allowFuture && value >= thisWeek;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Week">
      <Button type="button" variant="outline" size="icon" aria-label="Previous week" onClick={() => onChange(addDays(value, -7))}>
        <ChevronLeft aria-hidden />
      </Button>
      <span className="inline-flex min-w-44 items-center justify-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium tabular" aria-live="polite">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
        {formatWeekRange(value)}
      </span>
      <Button type="button" variant="outline" size="icon" aria-label="Next week" disabled={atLatest} onClick={() => onChange(addDays(value, 7))}>
        <ChevronRight aria-hidden />
      </Button>
      {value !== thisWeek ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(thisWeek)}>
          This week
        </Button>
      ) : null}
    </div>
  );
}
