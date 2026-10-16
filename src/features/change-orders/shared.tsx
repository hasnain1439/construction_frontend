"use client";

import { Check, X } from "lucide-react";
import type { ChangeOrderStatus, ProjectStatus } from "@/api/types";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/status";
import { STEPS, stepIndex } from "./calc";

/** Change orders are made / changed while the project runs (mirrors the API). */
export const CO_EDIT_STATUSES: ProjectStatus[] = ["ACTIVE", "CLOSEOUT"];

const TONE: Record<ChangeOrderStatus, StatusTone> = {
  DRAFT: "neutral",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  BILLED: "success",
};

export function ChangeOrderStatusBadge({ status }: { status: ChangeOrderStatus }) {
  const t = useT();
  return <StatusBadge tone={TONE[status]} label={t(`changeOrders.status.${status}`)} />;
}

/** Signed owner amount: a deduction shows with a minus. */
export function SignedMoney({ paisa, className }: { paisa: string | null | undefined; className?: string }) {
  return <MoneyText paisa={paisa} className={cn(paisa?.startsWith("-") ? "text-danger" : undefined, className)} />;
}

/** DRAFT → SENT → APPROVED → IN_PROGRESS → COMPLETED → BILLED; REJECTED marks the "sent" step red. */
export function StatusStepper({ status }: { status: ChangeOrderStatus }) {
  const t = useT();
  const at = stepIndex(status);
  const rejected = status === "REJECTED";
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label={t("changeOrders.detail.progress")}>
      {STEPS.map((step, i) => {
        const done = i < at || (i === at && status === "BILLED");
        const current = i === at && status !== "BILLED";
        const failed = rejected && i === at;
        return (
          <li key={step} className="flex items-center gap-2" data-testid={`step-${step}`} data-state={failed ? "rejected" : done ? "done" : current ? "current" : "todo"} aria-current={current ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                failed ? "border-danger bg-danger-soft text-danger" : done ? "border-success bg-success-soft text-success" : current ? "border-primary bg-sun-soft" : "text-muted-foreground",
              )}
            >
              {failed ? <X className="size-3.5" aria-hidden /> : done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm", current || failed ? "font-semibold" : "text-muted-foreground")}>
              {failed ? t("changeOrders.detail.rejectedStep") : t(`changeOrders.status.${step}`)}
            </span>
            {i < STEPS.length - 1 ? <span className="hidden h-px w-6 bg-border sm:block" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
