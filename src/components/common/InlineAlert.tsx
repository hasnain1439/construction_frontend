import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES: Record<"danger" | "warning" | "info" | "success", { icon: LucideIcon; className: string }> = {
  danger: { icon: CircleAlert, className: "border-danger/25 bg-danger-soft text-foreground [&_svg]:text-danger" },
  warning: { icon: TriangleAlert, className: "border-warning/30 bg-warning-soft text-foreground [&_svg]:text-warning" },
  info: { icon: Info, className: "border-primary/20 bg-info-soft text-foreground [&_svg]:text-primary" },
  success: { icon: CircleCheck, className: "border-success/25 bg-success-soft text-foreground [&_svg]:text-success" },
};

/** Inline message box (form errors, warnings, notes) — icon + text, never colour alone. */
export function InlineAlert({
  tone = "danger",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", toneClass, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-sm">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
