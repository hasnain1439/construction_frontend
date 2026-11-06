import type { PaidTo, PaymentMethod } from "@/api/types";
import { PAYMENT_METHOD_LABEL } from "@/lib/options";

/** Where a payment went: its group and account; older payments and those without an account name a method. */
export const paidToText = ({ paidTo, method }: { paidTo: PaidTo; method: PaymentMethod | null }) =>
  paidTo ? [paidTo.group, paidTo.name, paidTo.accountNumber].filter(Boolean).join(" · ") : method ? (PAYMENT_METHOD_LABEL[method] ?? method) : "—";
