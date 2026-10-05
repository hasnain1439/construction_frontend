"use client";

import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, todayPK } from "@/lib/dates";

export interface DateRange {
  from: string;
  to: string;
}

function startOfWeek(today: string) {
  const d = new Date(`${today}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Date range with quick chips (Today · This week · This month). Values are "YYYY-MM-DD". */
export function DateRangePicker({
  value,
  onChange,
  label,
  className,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
  label?: string;
  className?: string;
}) {
  const t = useT();
  const today = todayPK();
  const presets: Array<{ key: string; label: string; range: DateRange }> = [
    { key: "today", label: t("common.today"), range: { from: today, to: today } },
    { key: "week", label: t("common.thisWeek"), range: { from: startOfWeek(today), to: today } },
    { key: "month", label: t("common.thisMonth"), range: { from: `${today.slice(0, 8)}01`, to: today } },
  ];
  const summary =
    value.from || value.to ? `${formatDate(value.from, "…")} – ${formatDate(value.to, "…")}` : (label ?? "Any date");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("font-normal", className)} aria-label={label ?? "Date range"}>
          <CalendarRange data-icon="inline-start" />
          <span className={cn(!(value.from || value.to) && "text-muted-foreground")}>{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button key={preset.key} size="xs" variant="secondary" onClick={() => onChange(preset.range)}>
              {preset.label}
            </Button>
          ))}
          {value.from || value.to ? (
            <Button size="xs" variant="ghost" onClick={() => onChange({ from: "", to: "" })}>
              {t("common.clear")}
            </Button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t("common.from")}
            <Input type="date" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t("common.to")}
            <Input type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
