import { Banknote, Building2, FileCheck2, Landmark, Smartphone, Zap, type LucideIcon } from "lucide-react";
import type { ClientPaymentMethod, ClientPaymentStatus, InvoiceStatus } from "@/api/types";
import { cn } from "@/lib/cn";
import { StatusBadge } from "./StatusBadge";

/** Invoice status, plus "Overdue n days" when it applies. */
export function InvoiceStatusBadge({ status, overdueDays, className }: { status: InvoiceStatus; overdueDays?: number; className?: string }) {
  if (overdueDays && overdueDays > 0 && (status === "ISSUED" || status === "PARTLY_PAID")) {
    return <StatusBadge tone="danger" label={`Overdue ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`} className={className} />;
  }
  return <StatusBadge domain="invoice" value={status} className={className} />;
}

/** Cheque clearing state (non-cheque payments are shown as received). */
export function ChequeStatusBadge({ status, method, className }: { status: ClientPaymentStatus; method: ClientPaymentMethod; className?: string }) {
  if (method !== "CHEQUE" && status === "CLEARED") return <StatusBadge tone="success" label="Received" className={className} />;
  return <StatusBadge domain="cheque" value={status} className={className} />;
}

export const PAYMENT_METHODS: Array<{ value: ClientPaymentMethod; label: string; icon: LucideIcon }> = [
  { value: "BANK_TRANSFER", label: "Bank transfer", icon: Landmark },
  { value: "CHEQUE", label: "Cheque", icon: FileCheck2 },
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "RAAST", label: "Raast", icon: Zap },
  { value: "JAZZCASH", label: "JazzCash", icon: Smartphone },
  { value: "EASYPAISA", label: "Easypaisa", icon: Smartphone },
];
export const paymentMethodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

/** Icon + label for a payment method. */
export function PaymentMethodIcon({ method, bankName, className }: { method: ClientPaymentMethod; bankName?: string | null; className?: string }) {
  const meta = PAYMENT_METHODS.find((x) => x.value === method);
  const Icon = meta?.icon ?? Building2;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      {meta?.label ?? method}
      {bankName ? <span className="text-muted-foreground">· {bankName}</span> : null}
    </span>
  );
}
