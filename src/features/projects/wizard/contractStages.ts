/**
 * Billing stage rules of the contract tab — the same as the API (src/modules/projects/billingStages.ts):
 *   - QA B-08: the stage flagged `isRetention` always equals the project retention %; the other stages
 *     add up to 100 − retention.
 *   - QA B-35: a contract type starts from its own default template (the one made for that type, else
 *     the company default).
 */
import type { BillingModel, ContractType, PaymentTemplate } from "@/api/types";

export interface StageValue {
  label: string;
  percent: number | null;
  isRetention: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A usable retention % (0–10), or null while the field is empty / out of range. */
export const validRetention = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10 ? r2(v) : null;

/** Sum of the stages other than the retention. */
export const nonRetentionTotal = (stages: StageValue[]) => r2(stages.filter((s) => !s.isRetention).reduce((a, s) => a + (s.percent ?? 0), 0));

/**
 * The retention row follows the retention %: its percent is set, a row is added (last) when the
 * project holds retention, and removed at 0 %. Other rows are untouched.
 */
export function withRetention(stages: StageValue[], retention: number, retentionLabel: string): StageValue[] {
  const index = stages.findIndex((s) => s.isRetention);
  if (retention <= 0) return index === -1 ? stages : stages.filter((_, i) => i !== index);
  if (index === -1) return [...stages, { label: retentionLabel, percent: retention, isRetention: true }];
  if (stages[index]!.percent === retention) return stages;
  return stages.map((s, i) => (i === index ? { ...s, percent: retention } : s));
}

/** A template's stages fitted to the retention: the difference goes to the last non-retention stage. */
export function fitStages(stages: StageValue[], retention: number, retentionLabel: string): StageValue[] {
  const next = withRetention(stages.map((s) => ({ ...s })), retention, retentionLabel);
  const gap = r2(100 - retention - nonRetentionTotal(next));
  const last = next.map((s) => !s.isRetention).lastIndexOf(true);
  if (gap !== 0 && last !== -1) {
    const fitted = r2((next[last]!.percent ?? 0) + gap);
    if (fitted > 0) next[last] = { ...next[last]!, percent: fitted };
  }
  return next;
}

/** Running bills: one running stage and the retention (the stage table is hidden). */
export const runningStages = (retention: number, runningLabel: string, retentionLabel: string): StageValue[] =>
  withRetention([{ label: runningLabel, percent: r2(100 - retention), isRetention: false }], retention, retentionLabel);

/** The default template of a contract type (QA B-35): the one made for that type, else the company default. */
export function defaultTemplateFor(templates: PaymentTemplate[], contractType: ContractType | null | undefined): PaymentTemplate | undefined {
  return (contractType ? templates.find((t) => t.contractType === contractType) : undefined) ?? templates.find((t) => t.isDefault);
}

export const templateStages = (t: PaymentTemplate): StageValue[] => t.stages.map((s) => ({ label: s.label, percent: s.percent, isRetention: Boolean(s.isRetention) }));

export const sameStages = (a: StageValue[], b: StageValue[]) =>
  a.length === b.length && a.every((s, i) => s.label === b[i]!.label && s.percent === b[i]!.percent && s.isRetention === b[i]!.isRetention);

/** What one contract type had before the user switched away (QA B-18): restored on switching back. */
export interface TypeMemory {
  contractValuePaisa: string | null;
  ratePerSqftPaisa: string | null;
  billingModel: BillingModel;
  stages: StageValue[];
}

/**
 * Switching the contract type (QA B-18): what the old type had is remembered; the new type gets back
 * what it had before, else it KEEPS the contract value and rate on screen (nothing is wiped) and starts
 * from its own stages (running bills: one running stage + the retention; otherwise its default template).
 */
export function switchContract(
  current: TypeMemory & { contractType: ContractType },
  to: ContractType,
  billingModel: BillingModel,
  memory: Partial<Record<ContractType, TypeMemory>>,
  ctx: { retention: number; stagesFor: (type: ContractType, retention: number) => StageValue[]; labels: { running: string; retention: string } },
): { values: TypeMemory; memory: Partial<Record<ContractType, TypeMemory>> } {
  const { contractType: from, ...had } = current;
  const next = { ...memory, [from]: had };
  const saved = memory[to];
  const stages = saved
    ? withRetention(saved.stages, ctx.retention, ctx.labels.retention)
    : billingModel === "RUNNING_BILLS"
      ? runningStages(ctx.retention, ctx.labels.running, ctx.labels.retention)
      : ctx.stagesFor(to, ctx.retention);
  return {
    values: {
      contractValuePaisa: saved ? saved.contractValuePaisa : had.contractValuePaisa,
      ratePerSqftPaisa: saved ? saved.ratePerSqftPaisa : had.ratePerSqftPaisa,
      billingModel,
      stages,
    },
    memory: next,
  };
}
