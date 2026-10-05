import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/cn";
import { formatPKR } from "@/lib/money";

export interface PlanCardData {
  code: string;
  name: string;
  pricePaisa: string;
  maxActiveProjects: number | null;
  maxOfficeUsers: number | null;
  features: string[];
}

/** Plan with price, limits and features. Used by Subscription and the admin Plans page. */
export function PlanCard({
  plan,
  current,
  badge,
  action,
  className,
}: {
  plan: PlanCardData;
  current?: boolean;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-card",
        current && "border-primary ring-1 ring-primary",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{plan.code}</p>
        </div>
        {current ? <StatusBadge tone="info" label="Current plan" /> : badge}
      </div>
      <p>
        <span className="text-kpi font-semibold text-primary tabular">{formatPKR(plan.pricePaisa)}</span>
        <span className="text-sm text-muted-foreground"> / month</span>
      </p>
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-accent px-2.5 py-1 text-primary">
          {plan.maxActiveProjects === null ? "Unlimited" : plan.maxActiveProjects} active projects
        </span>
        <span className="rounded-full bg-accent px-2.5 py-1 text-primary">
          {plan.maxOfficeUsers === null ? "Unlimited" : plan.maxOfficeUsers} office users
        </span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
      {action ? <div className="mt-auto pt-2">{action}</div> : null}
    </div>
  );
}
