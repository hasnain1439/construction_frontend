import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusMeta, TONE_CLASSES, type StatusDomain, type StatusTone } from "@/lib/status";

type Props =
  | { domain: StatusDomain; value: string | boolean | null | undefined; label?: string; className?: string }
  | { tone: StatusTone; label: string; icon?: LucideIcon; className?: string; domain?: never; value?: never };

/** Pill badge: colour + icon + label. Use `domain`+`value` for known statuses. */
export function StatusBadge(props: Props) {
  const meta =
    "domain" in props && props.domain
      ? { ...statusMeta(props.domain, props.value), ...(props.label ? { label: props.label } : {}) }
      : { tone: props.tone as StatusTone, label: props.label, icon: props.icon };
  const Icon = meta.icon;
  return (
    <span
      data-tone={meta.tone}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[meta.tone],
        props.className,
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {meta.label}
    </span>
  );
}
