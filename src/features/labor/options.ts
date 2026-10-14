/** Option lists and labels shared by the labour and cash-book screens (translated with `useEnumT`). */
import { useCallback, useMemo } from "react";
import type { LaborPaidFrom, RateType } from "@/api/types";
import { enums as laborEnums } from "@/i18n/areas/labor/en";
import { useEnumT } from "@/i18n/useT";
import { humanize } from "@/lib/status";

export const PAID_FROM_VALUES: LaborPaidFrom[] = ["SITE_CASH", "OFFICE_CASH", "BANK", "JAZZCASH", "EASYPAISA"];

export const RATE_TYPE_OPTIONS: Array<{ value: RateType; unit: string }> = [
  { value: "PER_SQFT", unit: "sqft" },
  { value: "PER_TON", unit: "ton" },
  { value: "PER_BRICK", unit: "brick" },
  { value: "PER_RFT", unit: "rft" },
  { value: "PER_CFT", unit: "cft" },
  { value: "LUMPSUM", unit: "%" },
];

/** English labels (kept for the cash book until it reads `te("laborFloatMethod", v)`). */
export const FLOAT_METHOD_OPTIONS = (["CASH", "BANK", "JAZZCASH", "EASYPAISA"] as const).map((value) => ({ value, label: laborEnums.laborFloatMethod[value] }));

/** English labels (kept for the cash book until it reads `te("laborCashEntry", type)`). */
export const CASH_ENTRY_LABELS: Record<string, string> = laborEnums.laborCashEntry;

/** Labels in the current UI language: paid-from, rate type, unit, trade, ledger entry. */
export function useLaborLabels() {
  const te = useEnumT();
  const paidFrom = useCallback((v: string | null | undefined) => (v ? te("laborPaidFrom", v, humanize(v)) : "—"), [te]);
  const rateType = useCallback((v: string) => te("laborRateType", v, humanize(v)), [te]);
  const unit = useCallback((u: string | null | undefined) => (u ? te("laborRateUnit", u, u) : ""), [te]);
  const trade = useCallback((v: string) => te("trade", v, humanize(v)), [te]);
  const ledgerEntry = useCallback((v: string) => te("laborLedgerEntry", v, humanize(v)), [te]);
  const paidFromOptions = useMemo(() => PAID_FROM_VALUES.map((value) => ({ value, label: te("laborPaidFrom", value) })), [te]);
  const rateTypeOptions = useMemo(() => RATE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: te("laborRateType", o.value) })), [te]);
  return { paidFrom, rateType, unit, trade, ledgerEntry, paidFromOptions, rateTypeOptions };
}
