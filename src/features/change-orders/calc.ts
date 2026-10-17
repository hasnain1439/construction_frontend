/**
 * Step 15 · change-order maths and status rules, mirroring the backend
 * (construction-platform src/modules/change-orders): money in paisa (BigInt), quantities ≤ 3 dp.
 *   line cost   = round(qty × rate)
 *   price rate  = round(rate × (1 + markup %))
 *   line price  = round(qty × price rate)
 *   total       = ± Σ line price (minus for a DEDUCTION); markup = |total| − cost
 */
import type { ChangeOrderStatus, ChangeOrderType } from "@/api/types";
import type { PermissionKey } from "@/lib/permissionKeys";

/** a / b rounded half-up (both ≥ 0). */
const divRound = (a: bigint, b: bigint) => (a + b / BigInt(2)) / b;

/** "12.5" → 12500 (thousandths); null when not a number. */
function milli(qty: string | number | null | undefined): bigint | null {
  if (qty === null || qty === undefined || qty === "") return null;
  const n = Number(qty);
  if (!Number.isFinite(n) || n < 0) return null;
  return BigInt(Math.round(n * 1000));
}

const toBig = (v: string | null | undefined): bigint | null => {
  if (v === null || v === undefined || v === "" || !/^\d+$/.test(v)) return null;
  return BigInt(v);
};

/** rate × (1 + markup %) in paisa (markup with up to 2 decimals). */
export function priceRateOf(ratePaisa: bigint, markupPercent: number): bigint {
  const scaled = BigInt(Math.round((Number.isFinite(markupPercent) ? markupPercent : 0) * 100));
  return divRound(ratePaisa * (BigInt(10000) + scaled), BigInt(10000));
}

/** qty × rate in paisa. */
export function amountOf(quantity: string | number | null | undefined, ratePaisa: bigint): bigint | null {
  const q = milli(quantity);
  return q === null ? null : divRound(q * ratePaisa, BigInt(1000));
}

export interface BuilderLineInput {
  quantity: string | null;
  /** Cost rate in paisa (null = not known yet). */
  ratePaisa: string | null;
}

export interface BuilderTotals {
  lines: Array<{ amountPaisa: string | null; priceRatePaisa: string | null; priceAmountPaisa: string | null }>;
  costPaisa: string;
  markupPaisa: string;
  /** Signed: negative for a deduction. */
  totalPaisa: string;
  /** Lines without a quantity or rate (not counted). */
  incomplete: number;
}

export function builderTotals(lines: BuilderLineInput[], markupPercent: number, type: ChangeOrderType): BuilderTotals {
  let cost = BigInt(0);
  let price = BigInt(0);
  let incomplete = 0;
  const out = lines.map((l) => {
    const rate = toBig(l.ratePaisa);
    const amount = rate === null ? null : amountOf(l.quantity, rate);
    if (rate === null || amount === null) {
      incomplete += 1;
      return { amountPaisa: null, priceRatePaisa: rate === null ? null : priceRateOf(rate, markupPercent).toString(), priceAmountPaisa: null };
    }
    const priceRate = priceRateOf(rate, markupPercent);
    const priceAmount = amountOf(l.quantity, priceRate)!;
    cost += amount;
    price += priceAmount;
    return { amountPaisa: amount.toString(), priceRatePaisa: priceRate.toString(), priceAmountPaisa: priceAmount.toString() };
  });
  return {
    lines: out,
    costPaisa: cost.toString(),
    markupPaisa: (price - cost).toString(),
    totalPaisa: (type === "DEDUCTION" ? -price : price).toString(),
    incomplete,
  };
}

// ─── Status flow ────────────────────────────────────────────────────────────

export type ChangeOrderAction = "edit" | "delete" | "send" | "approve" | "reject" | "reopen" | "start" | "complete" | "bill";

/** The happy path shown by the stepper (REJECTED is a side branch of SENT). */
export const STEPS: ChangeOrderStatus[] = ["DRAFT", "SENT", "APPROVED", "IN_PROGRESS", "COMPLETED", "BILLED"];

/** Index of the step a status has reached (REJECTED sits on SENT). */
export const stepIndex = (status: ChangeOrderStatus) => (status === "REJECTED" ? 1 : STEPS.indexOf(status));

/**
 * What the user may do with a change order now — status rules of the API × the user's permissions.
 * `onInvoice`: the change order already sits on a live invoice (no second billing link).
 */
/**
 * Actions on a change order. `waitingStage`: billing "with the next stage invoice" was already chosen —
 * it lands there by itself, so "bill" is only offered to bill it separately (QA-A-14), never for a deduction.
 */
export function allowedActions(
  status: ChangeOrderStatus,
  can: (key: PermissionKey) => boolean,
  opts: { onInvoice?: boolean; waitingStage?: boolean; deduction?: boolean } = {},
): ChangeOrderAction[] {
  const edit = can("changeorder.edit");
  const approve = can("changeorder.approve");
  const bill = can("changeorder.manage") && can("billing.invoice.create") && !opts.onInvoice && !(opts.waitingStage && opts.deduction);
  const out: ChangeOrderAction[] = [];
  switch (status) {
    case "DRAFT":
      if (edit) out.push("edit", "send");
      if (approve) out.push("approve", "reject");
      if (edit) out.push("delete");
      break;
    case "SENT":
      if (approve) out.push("approve", "reject");
      if (edit) out.push("reopen");
      break;
    case "REJECTED":
      if (edit) out.push("reopen");
      break;
    case "APPROVED":
      if (edit) out.push("start", "complete");
      if (bill) out.push("bill");
      break;
    case "IN_PROGRESS":
      if (edit) out.push("complete");
      if (bill) out.push("bill");
      break;
    case "COMPLETED":
      if (bill) out.push("bill");
      break;
    case "BILLED":
      break;
  }
  return out;
}

/** Verbal approval needs a note (≥ 3 characters); screenshot / slip need a file. */
export function proofProblem(proofType: string | null, note: string, files: number): "PROOF_REQUIRED" | "PROOF_NOTE_REQUIRED" | "PROOF_FILE_REQUIRED" | null {
  if (!proofType) return "PROOF_REQUIRED";
  if (proofType === "VERBAL") return note.trim().length >= 3 ? null : "PROOF_NOTE_REQUIRED";
  return files > 0 ? null : "PROOF_FILE_REQUIRED";
}
