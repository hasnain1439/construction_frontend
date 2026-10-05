/**
 * Status vocabulary: every status is shown as colour + icon + label (never colour alone).
 * green = active / paid / received · amber = trial / pending / at risk · red = overdue /
 * expired / rejected · grey = inactive / locked / cancelled / draft.
 */
import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  Clock,
  Hourglass,
  Lock,
  PauseCircle,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

export interface StatusMeta {
  tone: StatusTone;
  label: string;
  icon: LucideIcon;
}

const S = (tone: StatusTone, label: string, icon: LucideIcon): StatusMeta => ({ tone, label, icon });

const DOMAINS = {
  project: {
    DRAFT: S("neutral", "Draft", CircleDashed),
    ACTIVE: S("success", "Active", CircleCheck),
    CLOSEOUT: S("warning", "Closeout", Hourglass),
    HANDED_OVER: S("info", "Handed over", CircleCheck),
    CLOSED: S("neutral", "Closed", CircleSlash),
    READ_ONLY: S("neutral", "Read-only", Lock),
  },
  subscription: {
    TRIAL: S("warning", "Trial", Hourglass),
    ACTIVE: S("success", "Active", CircleCheck),
    GRACE: S("warning", "Grace period", TriangleAlert),
    LAPSED: S("danger", "Lapsed", CircleX),
    CANCELLED: S("neutral", "Cancelled", Ban),
  },
  tenant: {
    ACTIVE: S("success", "Active", CircleCheck),
    READ_ONLY: S("neutral", "Read-only", Lock),
    SUSPENDED: S("danger", "Suspended", PauseCircle),
    CLOSED: S("neutral", "Closed", CircleSlash),
  },
  user: {
    ACTIVE: S("success", "Active", CircleCheck),
    INACTIVE: S("neutral", "Inactive", CircleSlash),
  },
  invitation: {
    PENDING: S("warning", "Pending", Clock),
    ACCEPTED: S("success", "Accepted", CircleCheck),
    EXPIRED: S("danger", "Expired", CircleX),
    CANCELLED: S("neutral", "Cancelled", Ban),
  },
  payment: {
    PENDING_REVIEW: S("warning", "Pending review", Clock),
    APPROVED: S("success", "Approved", CircleCheck),
    REJECTED: S("danger", "Rejected", CircleX),
    REFUNDED: S("neutral", "Refunded", CircleSlash),
  },
  billingStage: {
    UPCOMING: S("neutral", "Upcoming", CircleDashed),
    INVOICED: S("warning", "Invoiced", Clock),
    PAID: S("success", "Paid", CircleCheck),
  },
  active: {
    true: S("success", "Active", CircleCheck),
    false: S("neutral", "Inactive", CircleSlash),
  },
  visibility: {
    true: S("neutral", "Hidden", CircleSlash),
    false: S("success", "Active", CircleCheck),
  },
  device: {
    ACTIVE: S("success", "Active", CircleCheck),
    REVOKED: S("neutral", "Logged out", Ban),
  },
} as const;

export type StatusDomain = keyof typeof DOMAINS;

export function statusMeta(domain: StatusDomain, value: string | boolean | null | undefined): StatusMeta {
  const key = String(value);
  const table = DOMAINS[domain] as Record<string, StatusMeta>;
  return table[key] ?? S("neutral", key === "undefined" || key === "null" ? "—" : humanize(key), CircleDashed);
}

/** "HANDED_OVER" → "Handed over" */
export function humanize(value: string): string {
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
  neutral: "bg-neutral-soft text-muted-foreground border-border",
  info: "bg-info-soft text-primary border-primary/20",
};
