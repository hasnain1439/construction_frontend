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
  Flag,
  Hourglass,
  Info,
  Lock,
  OctagonAlert,
  PauseCircle,
  Send,
  TriangleAlert,
  Truck,
  Undo2,
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
    READY: S("info", "Ready to bill", Flag),
    INVOICED: S("warning", "Invoiced", Clock),
    PARTLY_PAID: S("warning", "Part paid", Hourglass),
    PAID: S("success", "Paid", CircleCheck),
  },
  invoice: {
    DRAFT: S("neutral", "Draft", CircleDashed),
    ISSUED: S("info", "Issued", Send),
    PARTLY_PAID: S("warning", "Part paid", Hourglass),
    PAID: S("success", "Paid", CircleCheck),
    CANCELLED: S("neutral", "Cancelled", Ban),
  },
  cheque: {
    CLEARED: S("success", "Cleared", CircleCheck),
    PENDING: S("warning", "Cheque pending", Clock),
    BOUNCED: S("danger", "Bounced", CircleX),
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
  purchase: {
    SAVED: S("success", "Saved", CircleCheck),
    PENDING_RATE: S("warning", "Rates pending", Clock),
    PENDING_RECEIPT: S("info", "Waiting at site", Truck),
    RECEIVED: S("success", "Received", CircleCheck),
    RECEIVED_WITH_SHORTAGE: S("warning", "Received — short", TriangleAlert),
  },
  purchaseOrder: {
    OPEN: S("info", "Open", CircleDashed),
    PARTLY_RECEIVED: S("warning", "Partly received", Hourglass),
    RECEIVED: S("success", "Received", CircleCheck),
    CANCELLED: S("neutral", "Cancelled", Ban),
  },
  dispatch: {
    ON_THE_WAY: S("info", "On the way", Truck),
    RECEIVED: S("success", "Received", CircleCheck),
    RECEIVED_WITH_SHORTAGE: S("warning", "Received — short", TriangleAlert),
    RECEIVED_WITH_EXCESS: S("warning", "Received — excess", TriangleAlert),
    CANCELLED: S("neutral", "Cancelled", Ban),
  },
  shortage: {
    OPEN: S("danger", "Open", TriangleAlert),
    RESOLVED: S("success", "Resolved", CircleCheck),
  },
  shortageKind: {
    DISPATCH_SHORT: S("warning", "Short", TriangleAlert),
    DAMAGED: S("danger", "Damaged", CircleX),
    EXCESS: S("info", "Excess", CircleDashed),
    SUPPLIER_SHORT: S("warning", "Supplier short", TriangleAlert),
  },
  supplierPayment: {
    CLEARED: S("success", "Cleared", CircleCheck),
    PENDING: S("warning", "Cheque pending", Clock),
    BOUNCED: S("danger", "Bounced", CircleX),
  },
  paymentMode: {
    UDHAAR: S("warning", "Udhaar", Clock),
    CASH: S("success", "Cash", CircleCheck),
    PARTIAL: S("info", "Part paid", Hourglass),
  },
  settlement: {
    DRAFT: S("neutral", "Draft", CircleDashed),
    SUBMITTED: S("warning", "Waiting for approval", Clock),
    APPROVED: S("success", "Approved", CircleCheck),
    RETURNED: S("danger", "Returned", Undo2),
  },
  linePayment: {
    UNPAID: S("warning", "Unpaid", Clock),
    PAID: S("success", "Paid", CircleCheck),
  },
  measurement: {
    RECORDED: S("warning", "To verify", Clock),
    VERIFIED: S("success", "Verified", CircleCheck),
    REJECTED: S("danger", "Rejected", CircleX),
  },
  advance: {
    OUTSTANDING: S("warning", "Outstanding", Clock),
    PARTLY_ADJUSTED: S("info", "Partly adjusted", Hourglass),
    ADJUSTED: S("success", "Adjusted", CircleCheck),
  },
  cashEntry: {
    PENDING_ACK: S("info", "Not received yet", Clock),
    PENDING_APPROVAL: S("warning", "Waiting for approval", Hourglass),
    APPROVED: S("success", "Approved", CircleCheck),
    REJECTED: S("danger", "Rejected", CircleX),
    POSTED: S("success", "Done", CircleCheck),
  },
  topup: {
    PENDING: S("warning", "Pending", Clock),
    APPROVED: S("success", "Sent", CircleCheck),
    REJECTED: S("danger", "Rejected", CircleX),
  },
  severity: {
    INFO: S("info", "Info", Info),
    WARNING: S("warning", "Warning", TriangleAlert),
    CRITICAL: S("danger", "Critical", OctagonAlert),
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
