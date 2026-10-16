/**
 * "Contract value from this estimate" — the same rules as the API (src/modules/estimate/contractValue.ts),
 * BigInt-safe, so the card can recompute live while the user edits the margin:
 *
 *   FULL                  value = cost × (1 + finishing %) × (1 + margin %)   → nearest Rs 1,000
 *   GREY_OWNER_FINISHING  value = cost × (1 + margin %)                       → nearest Rs 1,000
 *   LABOR_ONLY            rate  = labour × (1 + margin %) ÷ covered sq ft     → nearest Rs 5
 */
import { toPaisaBigInt, type PaisaInput } from "@/lib/money";

const ZERO = BigInt(0);
/** Rs 1,000 and Rs 5 in paisa. */
export const VALUE_STEP_PAISA = BigInt(100000);
export const RATE_STEP_PAISA = BigInt(500);
const PERCENT_SCALE = BigInt(10000); // percentages with 2 decimals → integers (100 % = 10,000)

/** Positive numerator ÷ denominator, half up. */
const divRound = (num: bigint, den: bigint) => (num * BigInt(2) + den) / (BigInt(2) * den);
const scaled = (percent: number) => BigInt(Math.round(percent * 100));
const valid = (p: number) => Number.isFinite(p) && p >= 0;

/** Suggested contract value in paisa (string), or null without a cost. */
export function suggestContractValue(costPaisa: PaisaInput, marginPercent: number, finishingPercent = 0): string | null {
  const cost = toPaisaBigInt(costPaisa);
  if (cost === null || cost <= ZERO || !valid(marginPercent) || !valid(finishingPercent)) return null;
  const num = cost * (PERCENT_SCALE + scaled(finishingPercent)) * (PERCENT_SCALE + scaled(marginPercent));
  return (divRound(num, PERCENT_SCALE * PERCENT_SCALE * VALUE_STEP_PAISA) * VALUE_STEP_PAISA).toString();
}

/** Suggested labour rate per sq ft in paisa (string), or null without labour or covered area. */
export function suggestLabourRate(labourPaisa: PaisaInput, marginPercent: number, coveredAreaSqft: number | null | undefined): string | null {
  const labour = toPaisaBigInt(labourPaisa);
  if (labour === null || labour <= ZERO || !valid(marginPercent) || !coveredAreaSqft || coveredAreaSqft <= 0) return null;
  const area = BigInt(Math.round(coveredAreaSqft * 100)); // sq ft with 2 decimals
  const num = labour * (PERCENT_SCALE + scaled(marginPercent)) * BigInt(100);
  return (divRound(num, PERCENT_SCALE * area * RATE_STEP_PAISA) * RATE_STEP_PAISA).toString();
}

/** The parts the card shows: cost → + finishing → + margin → suggested (before rounding for the parts). */
export function suggestionBreakdown(
  kind: "CONTRACT_VALUE" | "RATE_PER_SQFT",
  basisPaisa: PaisaInput,
  marginPercent: number,
  finishingPercent: number,
  coveredAreaSqft: number,
) {
  const basis = toPaisaBigInt(basisPaisa) ?? ZERO;
  const withFinishing = kind === "CONTRACT_VALUE" ? divRound(basis * (PERCENT_SCALE + scaled(finishingPercent)), PERCENT_SCALE) : basis;
  const finishing = withFinishing - basis;
  const withMargin = divRound(withFinishing * (PERCENT_SCALE + scaled(marginPercent)), PERCENT_SCALE);
  const margin = withMargin - withFinishing;
  const suggested = kind === "CONTRACT_VALUE" ? suggestContractValue(basis, marginPercent, finishingPercent) : suggestLabourRate(basis, marginPercent, coveredAreaSqft);
  return { basis: basis.toString(), finishing: finishing.toString(), margin: margin.toString(), total: withMargin.toString(), suggested };
}

/** suggested − current (paisa string), or null. */
export function differencePaisa(suggested: string | null, current: string | null): string | null {
  const a = toPaisaBigInt(suggested);
  const b = toPaisaBigInt(current);
  return a === null || b === null ? null : (a - b).toString();
}
