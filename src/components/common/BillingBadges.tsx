"use client";

import { Banknote, Building2, FileCheck2, Landmark, Smartphone, Zap, type LucideIcon } from "lucide-react";
import type { ClientPaymentMethod, ClientPaymentStatus, InvoiceStatus } from "@/api/types";
import { en } from "@/i18n/en";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { StatusBadge } from "./StatusBadge";

/** Invoice status, plus "Overdue n days" when it applies. */
export function InvoiceStatusBadge({ status, overdueDays, className }: { status: InvoiceStatus; overdueDays?: number; className?: string }) {
  const t = useT();
  if (overdueDays && overdueDays > 0 && (status === "ISSUED" || status === "PARTLY_PAID")) {
    return <StatusBadge tone="danger" label={overdueDays === 1 ? t("app.components.billing.overdueOneDay") : t("app.components.billing.overdueDays", { n: overdueDays })} className={className} />;
  }
  return <StatusBadge domain="invoice" value={status} className={className} />;
}

/** Cheque clearing state (non-cheque payments are shown as received). */
export function ChequeStatusBadge({ status, method, className }: { status: ClientPaymentStatus; method: ClientPaymentMethod; className?: string }) {
  const t = useT();
  if (method !== "CHEQUE" && status === "CLEARED") return <StatusBadge tone="success" label={t("field.received")} className={className} />;
  return <StatusBadge domain="cheque" value={status} className={className} />;
}

/** `label` is the English name (fallback); screens show `te("clientPaymentMethod", value)`. */
const METHOD_EN = en.enum.clientPaymentMethod;
export const PAYMENT_METHODS: Array<{ value: ClientPaymentMethod; label: string; icon: LucideIcon }> = [
  { value: "BANK_TRANSFER", label: METHOD_EN.BANK_TRANSFER, icon: Landmark },
  { value: "CHEQUE", label: METHOD_EN.CHEQUE, icon: FileCheck2 },
  { value: "CASH", label: METHOD_EN.CASH, icon: Banknote },
  { value: "RAAST", label: METHOD_EN.RAAST, icon: Zap },
  { value: "JAZZCASH", label: METHOD_EN.JAZZCASH, icon: Smartphone },
  { value: "EASYPAISA", label: METHOD_EN.EASYPAISA, icon: Smartphone },
];
export const paymentMethodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

/** Icon + label for a payment method. */
export function PaymentMethodIcon({ method, bankName, className }: { method: ClientPaymentMethod; bankName?: string | null; className?: string }) {
  const te = useEnumT();
  const meta = PAYMENT_METHODS.find((x) => x.value === method);
  const Icon = meta?.icon ?? Building2;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      {te("clientPaymentMethod", method, meta?.label)}
      {bankName ? <span className="text-muted-foreground">· {bankName}</span> : null}
    </span>
  );
}
