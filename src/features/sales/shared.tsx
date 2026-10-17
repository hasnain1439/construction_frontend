"use client";

import type { QuoteComputed, QuoteLostReason, QuoteQuantities, QuoteStatus } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useEnumT, useT, type TranslationKey } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { useEstimateWarningText } from "@/features/projects/estimate/warningText";
import type { StatusTone } from "@/lib/status";

const TONE: Record<QuoteStatus, StatusTone> = {
  DRAFT: "neutral",
  SENT: "info",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
  EXPIRED: "neutral",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const t = useT();
  return <StatusBadge tone={TONE[status]} label={t(`sales.status.${status}` as TranslationKey)} />;
}

export function useLostReasonLabel() {
  const t = useT();
  return (reason: QuoteLostReason | null) => (reason ? t(`sales.lostReason.${reason}` as TranslationKey) : "—");
}

const nf = (n: number, digits = 0) => n.toLocaleString("en-PK", { maximumFractionDigits: digits });

/** Quantity line in the right unit ("2,140 bags"). */
export const QTY_UNITS: Record<keyof QuoteQuantities, "bags" | "kg" | "nos" | "cft" | "sqft" | "gallons"> = {
  cementBags: "bags",
  steelKg: "kg",
  bricks: "nos",
  blocks: "nos",
  sandCft: "cft",
  crushCft: "cft",
  plasterSqft: "sqft",
  floorTilesSqft: "sqft",
  wallTilesSqft: "sqft",
  paintGallons: "gallons",
};

export function useQtyText() {
  const t = useT();
  return (key: keyof QuoteQuantities, value: number) => t(`sales.live.unit.${QTY_UNITS[key]}` as TranslationKey, { n: nf(value) });
}

function Row({ label, children, strong, testId }: { label: string; children: React.ReactNode; strong?: boolean; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm" data-testid={testId}>
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-base font-semibold" : undefined}>{children}</span>
    </div>
  );
}

/** Internal view: price, cost, margin, cost by section, quantities, floors assumed, warnings. */
export function InternalPanel({ data, loading }: { data: QuoteComputed | null | undefined; loading?: boolean }) {
  const t = useT();
  const warnText = useEstimateWarningText();
  const enumT = useEnumT();
  const qty = useQtyText();
  return (
    <SectionCard title={t("sales.live.title")} description={loading ? t("sales.live.calculating") : t("sales.live.description")}>
      {!data ? (
        <p className="text-sm text-muted-foreground">{t("sales.live.needInputs")}</p>
      ) : (
        <div className="space-y-5" data-testid="quote-internal" aria-busy={loading || undefined}>
          <div className="divide-y">
            <Row label={t("sales.live.price")} strong testId="quote-price">
              <MoneyText paisa={data.pricePaisa} />
            </Row>
            <Row label={t("sales.live.perSqft")}>
              <MoneyText paisa={data.perSqftPaisa} />
            </Row>
            {data.priceOverridden && data.computedPricePaisa ? (
              <p className="py-1.5 text-xs text-muted-foreground">
                {t("sales.live.overridden", { amount: formatPKR(data.computedPricePaisa) })}
              </p>
            ) : null}
            <Row label={t("sales.live.cost")} testId="quote-cost">
              <MoneyText paisa={data.costPaisa} />
            </Row>
            <Row label={t("sales.live.costPerSqft")}>
              <MoneyText paisa={data.costPerSqftPaisa} />
            </Row>
            {data.finishingAllowancePaisa && data.finishingAllowancePaisa !== "0" ? (
              <Row label={t("sales.live.finishingAllowance")}>
                <MoneyText paisa={data.finishingAllowancePaisa} />
              </Row>
            ) : null}
            <Row label={t("sales.live.margin")} testId="quote-margin">
              <span className="inline-flex flex-wrap items-baseline justify-end gap-2">
                <MoneyText paisa={data.marginPaisa} />
                {data.marginOnPricePercent !== undefined && data.marginOnPricePercent !== null ? (
                  <span className="text-xs text-muted-foreground">{t("sales.live.marginOnPrice", { p: data.marginOnPricePercent })}</span>
                ) : null}
              </span>
            </Row>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">{t("sales.live.sections")}</h3>
            <div className="divide-y">
              {data.sections.map((s) => (
                <Row key={s.section} label={t(`sales.section.${s.section}` as TranslationKey)}>
                  <MoneyText paisa={s.amountPaisa} />
                </Row>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">{t("sales.live.quantities")}</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {(Object.keys(QTY_UNITS) as Array<keyof QuoteQuantities>)
                .filter((k) => data.quantities[k] > 0)
                .map((k) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t(`sales.live.qty.${k}` as TranslationKey)}</dt>
                    <dd className="tabular" dir="ltr">
                      {qty(k, data.quantities[k])}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">{t("sales.live.floors")}</h3>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {data.basis.floors.map((f) => (
                <li key={f.level}>
                  {t("sales.live.floorLine", {
                    name: enumT("projectFloorLevel", f.level, f.name),
                    area: nf(f.areaSqft),
                    rooms: f.rooms,
                    wet: f.wetRooms,
                  })}
                </li>
              ))}
            </ul>
          </div>

          {data.warnings.length ? (
            <InlineAlert tone="warning" title={t("sales.live.warnings")}>
              <ul className="list-disc ps-5">
                {data.warnings.map((w) => (
                  <li key={w.code}>{warnText(w)}</li>
                ))}
              </ul>
            </InlineAlert>
          ) : null}
          <InlineAlert tone="info" title={t("sales.live.assumptions")}>
            {t("sales.live.assumptionsHint")}
          </InlineAlert>
        </div>
      )}
    </SectionCard>
  );
}

/** Customer view: what the client's PDF shows — total, rate, scope, specifications, schedule. Never cost or margin. */
export function CustomerPanel({ data, validUntil }: { data: QuoteComputed | null | undefined; validUntil?: string | null }) {
  const t = useT();
  const enumT = useEnumT();
  if (!data) return null;
  const total = data.paymentStages.reduce((a, s) => a + s.percent, 0);
  return (
    <SectionCard title={t("sales.customer.title")} description={t("sales.customer.description")}>
      <div className="space-y-4" data-testid="quote-customer">
        <div className="divide-y">
          <Row label={t("sales.customer.total")} strong>
            <MoneyText paisa={data.pricePaisa} />
          </Row>
          <Row label={t("sales.customer.rate")}>
            <MoneyText paisa={data.perSqftPaisa} />
          </Row>
        </div>
        <p className="text-sm">
          <span className="font-semibold">{t("sales.customer.scope")}: </span>
          {t("sales.customer.scopeLine", {
            contract: enumT("projectContractType", data.inputs.contractType),
            storeys: data.inputs.floors,
            area: nf(data.inputs.coveredAreaSqft),
          })}
        </p>
        <div>
          <h3 className="mb-1 text-sm font-semibold">{t("sales.customer.specs")}</h3>
          <ul className="space-y-0.5 text-sm">
            {data.specifications.map((s) => (
              <li key={s.categoryKey} className="flex justify-between gap-3">
                <span>{enumT("projectSupplyCategory", s.categoryKey, s.label)}</span>
                <span className="text-muted-foreground">
                  {s.suppliedBy === "OWNER" ? t("sales.customer.byOwner") : t("sales.customer.byContractor")}
                  {s.qualityCategory ? ` · ${s.qualityCategory.name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">{t("sales.customer.stages")}</h3>
          <ul className="space-y-0.5 text-sm">
            {data.paymentStages.map((s, i) => (
              <li key={`${i}-${s.label}`} className="flex justify-between gap-3">
                <span>
                  {s.label} <span className="text-muted-foreground tabular">({s.percent}%)</span>
                </span>
                <MoneyText paisa={s.amountPaisa} />
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">{t("sales.customer.totalPercent", { p: Math.round(total * 100) / 100 })}</p>
        </div>
        {validUntil ? <p className="text-xs text-muted-foreground">{t("sales.customer.validFor", { date: formatDate(validUntil) })}</p> : null}
      </div>
    </SectionCard>
  );
}
