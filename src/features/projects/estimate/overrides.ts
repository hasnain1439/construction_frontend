/**
 * The project's own estimate values (the PROJECT layer of the rulebook) and where a BoQ line's rate
 * can be changed (QA B-05).
 *
 * `PUT /projects/:id/estimate/settings` REPLACES the stored object: anything left out goes back to the
 * company value. So every write sends all of the project's current overrides plus the change —
 * engine settings from `settings`, BoQ-only keys (lump-sum rates, overheads, contingency …) from
 * `boq.parameters` / `boq.assumptions` where their source is PROJECT.
 */
import type { BoqLine, EstimateSettings, ProjectEstimate } from "@/api/types";

export type SettingsBody = Partial<EstimateSettings> & Record<string, unknown>;

/** Every value this project stores today (what a save must send back to keep it). */
export function projectOverrides(e: ProjectEstimate): SettingsBody {
  const out: SettingsBody = {};
  const settings = e.settings as unknown as Record<string, unknown>;
  for (const key of e.customised as string[]) {
    if (key in settings) out[key] = settings[key];
  }
  for (const a of e.boq?.assumptions ?? []) {
    if (a.source === "PROJECT" && !(a.key in settings)) out[a.key] = a.value;
  }
  for (const [key, p] of Object.entries(e.boq?.parameters ?? {})) {
    if (p.source === "PROJECT" && !(key in settings) && out[key] === undefined) out[key] = p.value;
  }
  return out;
}

/**
 * Rulebook key behind a lump-sum / percent line of the current API (`rateKey` on a newer one wins):
 * the last part of the line key ("MEP_ROUGH_IN.PLASTER_MEP.electrical" → "electrical").
 */
const LINE_RATE_KEYS: Record<string, string> = {
  excavation: "excavationRsPerCft",
  plinthFilling: "earthFillingRsPerCft",
  roofEarthFill: "earthFillingRsPerCft",
  roofLeep: "leepRsPerSqft",
  roofWaterproofing: "roofWaterproofingRsPerSqft",
  electrical: "mepElectricalRsPerSqft",
  plumbing: "mepPlumbingRsPerWetRoom",
  sewerageGas: "mepSewerageGasRsLumpSum",
  equipment: "equipmentShutteringRsPerSqft",
  cartAway: "cartAwayRsPerCft",
  siteOverheads: "siteOverheadPercent",
  contingency: "contingencyPercent",
};

export type RateSource = { kind: "RULEBOOK"; key: string } | { kind: "PRICE_LIST" } | { kind: "LABOUR_RATES" } | null;

/** Where the rate of a BoQ line is set: a project rulebook value, the price list or the sub-contract rates. */
export function rateSource(line: Pick<BoqLine, "kind" | "lineKey" | "suppliedBy"> & { rateKey?: string | null }): RateSource {
  if (line.suppliedBy === "OWNER") return null;
  if (line.rateKey) return { kind: "RULEBOOK", key: line.rateKey };
  if (line.kind === "LUMP_SUM" || line.kind === "PERCENT") {
    const key = LINE_RATE_KEYS[line.lineKey.split(".").at(-1) ?? ""];
    return key ? { kind: "RULEBOOK", key } : null;
  }
  if (line.kind === "MATERIAL") return { kind: "PRICE_LIST" };
  if (line.kind === "LABOUR") return { kind: "LABOUR_RATES" };
  return null;
}

/** Σ amounts of the visible contractor lines (not the percent lines) — must equal the direct cost. */
export function visibleLinesPaisa(lines: Array<Pick<BoqLine, "kind" | "suppliedBy" | "amountPaisa">>): bigint {
  return lines.reduce((sum, l) => (l.kind !== "PERCENT" && l.suppliedBy === "CONTRACTOR" && l.amountPaisa ? sum + BigInt(l.amountPaisa) : sum), BigInt(0));
}
