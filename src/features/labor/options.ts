/** Labels shared by the labour and cash-book screens. */
import type { LaborPaidFrom, RateType } from "@/api/types";
import { humanize } from "@/lib/status";

export const PAID_FROM_OPTIONS: Array<{ value: LaborPaidFrom; label: string }> = [
  { value: "SITE_CASH", label: "Site cash" },
  { value: "OFFICE_CASH", label: "Office cash" },
  { value: "BANK", label: "Bank" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
];
export const paidFromLabel = (v: string | null | undefined) => PAID_FROM_OPTIONS.find((o) => o.value === v)?.label ?? (v ? humanize(v) : "—");

export const RATE_TYPE_OPTIONS: Array<{ value: RateType; label: string; unit: string }> = [
  { value: "PER_SQFT", label: "Per sq ft", unit: "sqft" },
  { value: "PER_TON", label: "Per ton", unit: "ton" },
  { value: "PER_BRICK", label: "Per brick", unit: "brick" },
  { value: "PER_RFT", label: "Per running ft", unit: "rft" },
  { value: "PER_CFT", label: "Per cu ft", unit: "cft" },
  { value: "LUMPSUM", label: "Lump sum (theka)", unit: "%" },
];
export const rateTypeLabel = (v: string) => RATE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? humanize(v);

export const FLOAT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
] as const;

export const CASH_ENTRY_LABELS: Record<string, string> = {
  FLOAT_IN: "Float received",
  EXPENSE: "Kharcha",
  PESHGI: "Peshgi",
  WAGE_PAYMENT: "Wages",
  SUBCONTRACT_PAYMENT: "Sub-contractor payment",
  PURCHASE: "Purchase",
  HANDOVER_OUT: "Handed over",
  HANDOVER_IN: "Received (handover)",
  COUNT_ADJUSTMENT: "Count difference",
  REFUND_IN: "Refund",
};

export const workerTypeLabel = (type: string) => humanize(type);
