"use client";

import { Calculator, FileText, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useGetQualityCategoriesQuery } from "@/api/services/masterData.api";
import { useGetQuoteTemplatesQuery, useGetQuoteWorkRatesQuery } from "@/api/services/sales.api";
import type { QuoteContractType, QuotePriceBasis, QuoteScopeBody, QuoteScopeContent, QuoteScopeItem, QuoteScopeWho, QuoteWorkRate, SupplyCategoryKey } from "@/api/types";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SUPPLY_CATEGORIES } from "@/features/projects/constants";
import { msg } from "@/i18n/message";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatPKR } from "@/lib/money";
import { paisaSchema } from "@/lib/validation";

export const SCOPE_WHO: QuoteScopeWho[] = ["INCLUDED", "OWNER", "EXCLUDED"];
const BASES: Array<"NONE" | QuotePriceBasis> = ["NONE", "SQFT", "UNIT", "LUMP_SUM"];
const required = (label: string, max: number) => z.string().trim().min(1, msg("validation.required", { label })).max(max, msg("validation.tooLongPlain"));

/** One work line in a form: the price flattened (basis NONE = no price of its own). */
const itemSchema = z
  .object({
    text: required("sales.scope.item", 400),
    who: z.enum(["INCLUDED", "OWNER", "EXCLUDED"]),
    basis: z.enum(["NONE", "SQFT", "UNIT", "LUMP_SUM"]),
    ratePaisa: z.string().nullable(),
    quantity: z.number().nullable(),
    materials: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.basis !== "NONE" && !(v.ratePaisa && /^\d+$/.test(v.ratePaisa))) ctx.addIssue({ code: "custom", path: ["ratePaisa"], message: msg("validation.required", { label: "sales.scope.price" }) });
    if (v.basis === "UNIT" && !(v.quantity && v.quantity > 0)) ctx.addIssue({ code: "custom", path: ["quantity"], message: msg("validation.required", { label: "sales.scope.quantity" }) });
  });

/** Form fields of a quotation's content (same limits as the API). */
export const scopeContentFields = {
  qualityCategoryId: z.string().nullable().optional(),
  name: required("sales.scope.name", 80),
  sections: z.array(z.object({ title: required("sales.scope.sectionTitle", 120), outside: z.boolean(), items: z.array(itemSchema).max(60) })).max(30),
  rates: z.array(z.object({ label: required("sales.scope.rateLabel", 80), ratePerSqftPaisa: paisaSchema("sales.scope.rate") })).max(6),
  baseRates: z.array(z.object({ item: required("sales.scope.baseItem", 160), ratePaisa: paisaSchema("sales.scope.baseRate"), unit: required("sales.scope.baseUnit", 20) })).max(20),
  terms: z.array(z.object({ title: z.string().trim().max(120), text: required("sales.scope.termText", 1000) })).max(40),
};
export const scopeSchema = z.object({ templateId: z.string().nullable().optional(), ...scopeContentFields });
export type ScopeForm = z.input<typeof scopeSchema>;
type FormItem = z.input<typeof itemSchema>;

const itemToForm = (i: QuoteScopeItem): FormItem => ({
  text: i.text,
  who: i.who,
  basis: i.price?.basis ?? "NONE",
  ratePaisa: i.price?.ratePaisa ?? null,
  quantity: i.price?.quantity ?? null,
  materials: [...(i.materials ?? [])],
});
const itemFromForm = (i: FormItem): QuoteScopeItem => ({
  text: i.text,
  who: i.who,
  price: i.basis === "NONE" || !i.ratePaisa ? null : { basis: i.basis, ratePaisa: i.ratePaisa, quantity: i.basis === "UNIT" ? i.quantity : null },
  materials: i.materials as SupplyCategoryKey[],
});

/** A quotation's content (template or quote copy) as form values. */
export const scopeBody = (s: QuoteScopeContent & { templateId?: string | null; id?: string }): ScopeForm => ({
  templateId: s.templateId ?? s.id ?? null,
  qualityCategoryId: s.qualityCategoryId ?? null,
  name: s.name,
  sections: s.sections.map((x) => ({ title: x.title, outside: Boolean(x.outside), items: x.items.map(itemToForm) })),
  rates: s.rates.map((r) => ({ label: r.label, ratePerSqftPaisa: r.ratePerSqftPaisa })),
  baseRates: s.baseRates.map((r) => ({ item: r.item, ratePaisa: r.ratePaisa, unit: r.unit })),
  terms: s.terms.map((x) => ({ title: x.title, text: x.text })),
});

/** Form values → the request shape. */
export const scopeFromForm = (f: ScopeForm): QuoteScopeBody => ({
  templateId: f.templateId ?? null,
  qualityCategoryId: f.qualityCategoryId ?? null,
  name: f.name,
  sections: f.sections.map((x) => ({ title: x.title, outside: x.outside, items: x.items.map(itemFromForm) })),
  rates: f.rates.map((r) => ({ label: r.label, ratePerSqftPaisa: r.ratePerSqftPaisa ?? "0" })),
  baseRates: f.baseRates.map((r) => ({ item: r.item, ratePaisa: r.ratePaisa ?? "0", unit: r.unit })),
  terms: f.terms.map((x) => ({ title: x.title, text: x.text })),
});

/** A work line name as a lookup key (case and spaces do not matter) — same rule as the API. */
export const workKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
/** The work rate of a line for a contract type (labour-only takes the labour rate). */
export function rateFor(rates: QuoteWorkRate[] | undefined, name: string, contractType: QuoteContractType): QuoteScopeItem["price"] {
  const r = rates?.find((x) => workKey(x.name) === workKey(name));
  const rate = r ? (contractType === "LABOR_ONLY" ? (r.labourRatePaisa ?? r.ratePaisa) : (r.ratePaisa ?? r.labourRatePaisa)) : null;
  return r && rate ? { basis: r.basis, ratePaisa: rate, quantity: r.basis === "UNIT" ? 1 : null } : null;
}
/** A template's lines with the prices (and materials) of the work rates — what a quote starts from. */
export function withWorkRates<T extends QuoteScopeContent>(scope: T, rates: QuoteWorkRate[] | undefined, contractType: QuoteContractType): T {
  return {
    ...scope,
    sections: scope.sections.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => {
        if (it.price) return it;
        const price = rateFor(rates, it.text, contractType);
        const r = rates?.find((x) => workKey(x.name) === workKey(it.text));
        return price ? { ...it, price, materials: it.materials?.length ? it.materials : [...(r?.materials ?? [])] } : it;
      }),
    })),
  };
}

/** Sum of the rate parts (paisa). */
export const rateTotal = (s: { rates: Array<{ ratePerSqftPaisa: string | null }> }) => s.rates.reduce((a, r) => a + BigInt(r.ratePerSqftPaisa || "0"), BigInt(0));
/** Sum of the per-sq-ft prices of the included lines (paisa). */
export const lineRateTotal = (s: Pick<QuoteScopeContent, "sections">) =>
  s.sections.reduce((a, x) => a + x.items.reduce((b, i) => b + (i.who === "INCLUDED" && i.price?.basis === "SQFT" ? BigInt(i.price.ratePaisa) : BigInt(0)), BigInt(0)), BigInt(0));
const counts = (s: QuoteScopeContent) => ({ n: s.sections.length, items: s.sections.reduce((a, x) => a + x.items.length, 0), terms: s.terms.length });

const WHO_TONE: Record<QuoteScopeWho, string> = {
  INCLUDED: "bg-success-soft text-success",
  OWNER: "bg-warning-soft text-warning",
  EXCLUDED: "bg-danger-soft text-danger",
};

/** Field path prefix: "" (the form is the content) or "scope." */
const pre = (name: string) => (name ? `${name}.` : "");

export function WhoBadge({ who }: { who: QuoteScopeWho }) {
  const t = useT();
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", WHO_TONE[who])}>{t(`sales.scope.whoLabel.${who}`)}</span>;
}

/** "Rs 40 / sq ft", "Rs 8,000 × 4", "Rs 25,000". */
export function usePriceText() {
  const t = useT();
  return (p: QuoteScopeItem["price"]) =>
    !p ? "" : p.basis === "SQFT" ? t("sales.scope.perSqftText", { rate: formatPKR(p.ratePaisa) }) : p.basis === "UNIT" ? t("sales.scope.perUnitText", { rate: formatPKR(p.ratePaisa), n: p.quantity ?? 1 }) : formatPKR(p.ratePaisa);
}

function RemoveButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" className={className} onClick={onClick} aria-label={label}>
      <Trash2 />
    </Button>
  );
}

/** Supply categories of a line's material (who buys them follows the line). */
export function MaterialsField({ name }: { name: string }) {
  const t = useT();
  const enumT = useEnumT();
  return (
    <Controller
      name={name}
      render={({ field }) => {
        const value = (field.value ?? []) as string[];
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="max-w-full justify-start overflow-hidden" title={value.map((k) => enumT("projectSupplyCategory", k)).join(", ")}>
                <span className="truncate">{value.length ? t("sales.scope.materialsSome", { list: value.map((k) => enumT("projectSupplyCategory", k)).join(", ") }) : t("sales.scope.materialsNone")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <p className="mb-2 text-xs text-muted-foreground">{t("sales.scope.materialsHint")}</p>
              <div className="grid gap-1">
                {SUPPLY_CATEGORIES.map(({ key }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={value.includes(key)} onChange={(e) => field.onChange(e.target.checked ? [...value, key] : value.filter((k) => k !== key))} />
                    {enumT("projectSupplyCategory", key)}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
}

function SectionItems({ name, section, withPrices, contractType }: { name: string; section: number; withPrices: boolean; contractType?: QuoteContractType }) {
  const t = useT();
  const priceText = usePriceText();
  const base = `${pre(name)}sections.${section}.items`;
  const { fields, append, remove } = useFieldArray({ name: base });
  const items = (useWatch({ name: base }) ?? []) as FormItem[];
  const { data: workRates } = useGetQuoteWorkRatesQuery(undefined, { skip: withPrices });
  const whoOptions = SCOPE_WHO.map((w) => ({ value: w, label: t(`sales.scope.whoLabel.${w}`) }));
  const basisOptions = BASES.map((b) => ({ value: b, label: t(`sales.scope.basis.${b}`) }));
  /** The work names of the work rates (with their price) — plus the line's own name when it is not one of them. */
  const workOptions = (current: string | undefined) => {
    const list = (workRates?.rates ?? []).map((r) => {
      const price = contractType ? rateFor([r], r.name, contractType) : null;
      return { value: r.name, label: r.name, ...(price ? { description: priceText(price) } : {}) };
    });
    return current && !list.some((o) => workKey(o.value) === workKey(current)) ? [{ value: current, label: current, description: t("sales.scope.noRate") }, ...list] : list;
  };
  return (
    <div className="space-y-2">
      {fields.map((f, i) => {
        const basis = items[i]?.basis ?? "NONE";
        const found = !withPrices && contractType ? rateFor(workRates?.rates, items[i]?.text ?? "", contractType) : null;
        return (
          <div key={f.id} className="space-y-2 border-b border-dashed pb-2 last:border-0">
            <div className={cn("grid items-start gap-2", withPrices ? "grid-cols-[1.5rem_minmax(0,1fr)_9rem_auto]" : "grid-cols-[1.5rem_minmax(0,1fr)_7rem_7rem_9rem_auto]")}>
              <span className="pt-2 text-end text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              {withPrices ? (
                <TextField name={`${base}.${i}.text`} label={t("sales.scope.item")} hideLabel dir="auto" />
              ) : (
                <ComboboxField
                  className={cn("transition-opacity", items[i]?.who !== "INCLUDED" && "opacity-45")}
                  name={`${base}.${i}.text`}
                  label={t("sales.scope.item")}
                  hideLabel
                  placeholder={t("sales.scope.pickWork")}
                  searchPlaceholder={t("sales.scope.searchWork")}
                  emptyText={t("sales.scope.noWorkFound")}
                  options={workOptions(items[i]?.text)}
                />
              )}
              {!withPrices ? (
                <>
                  {/* the price and unit of the chosen work (from Work rates) */}
                  <span
                    className={cn("flex h-9 items-center rounded-md border px-2 text-sm tabular-nums transition-opacity", !found && "text-warning", found && items[i]?.who !== "INCLUDED" && "line-through opacity-45")}
                    title={found && items[i]?.who !== "INCLUDED" ? t("sales.scope.notAddedHint") : undefined}
                    data-testid="line-rate"
                  >
                    {found ? formatPKR(found.ratePaisa) : "—"}
                  </span>
                  <span className={cn("flex h-9 items-center rounded-md border px-2 text-sm text-muted-foreground transition-opacity", items[i]?.who !== "INCLUDED" && "opacity-45")} data-testid="line-unit">
                    {found ? t(`sales.scope.unit.${found.basis}`) : t("sales.scope.noRateShort")}
                  </span>
                </>
              ) : null}
              <SelectField name={`${base}.${i}.who`} label={t("sales.scope.who")} hideLabel options={whoOptions} />
              <RemoveButton className="mt-1" label={t("sales.scope.removeItem")} onClick={() => remove(i)} />
            </div>
            {withPrices ? (
              <div className="ms-8 grid grid-cols-[8rem_8rem_5rem_minmax(0,1fr)] items-start gap-2">
                <SelectField name={`${base}.${i}.basis`} label={t("sales.scope.priceBasis")} hideLabel options={basisOptions} />
                {basis !== "NONE" ? <MoneyField name={`${base}.${i}.ratePaisa`} label={t("sales.scope.price")} hideLabel /> : <span />}
                {basis === "UNIT" ? <NumberField name={`${base}.${i}.quantity`} label={t("sales.scope.quantity")} hideLabel placeholder={t("sales.scope.quantity")} /> : <span />}
                <div className="min-w-0 pt-0.5">
                  <MaterialsField name={`${base}.${i}.materials`} />
                </div>
              </div>
            ) : contractType && !found && items[i]?.text ? (
              <p className="ms-8 text-xs text-warning">{t("sales.scope.noRate")}</p>
            ) : null}
          </div>
        );
      })}
      <Button type="button" variant="ghost" size="sm" disabled={fields.length >= 60} onClick={() => append({ text: "", who: "INCLUDED", basis: "NONE", ratePaisa: null, quantity: null, materials: [] })}>
        <Plus data-icon="inline-start" />
        {t("sales.scope.addItem")}
      </Button>
    </div>
  );
}

/** Editable name, quality category, rate parts, sections → priced items, material base rates and notes, under `name`. */
export function ScopeFields({ name, withPrices = true, contractType }: { name: string; withPrices?: boolean; contractType?: QuoteContractType }) {
  const t = useT();
  const sections = useFieldArray({ name: `${pre(name)}sections` });
  const rates = useFieldArray({ name: `${pre(name)}rates` });
  const baseRates = useFieldArray({ name: `${pre(name)}baseRates` });
  const terms = useFieldArray({ name: `${pre(name)}terms` });
  const rateValues = (useWatch({ name: `${pre(name)}rates` }) ?? []) as Array<{ ratePerSqftPaisa: string | null }>;
  const { data: categories } = useGetQualityCategoriesQuery();
  return (
    <div className="space-y-6">
      <TextField name={`${pre(name)}name`} label={t("sales.scope.name")} placeholder={t("sales.scope.namePlaceholder")} required dir="auto" />
      <SelectField
        name={`${pre(name)}qualityCategoryId`}
        label={t("sales.scope.quality")}
        hint={t("sales.scope.qualityHint")}
        noneLabel={t("sales.scope.qualityDefault")}
        placeholder={t("sales.scope.qualityDefault")}
        options={(categories ?? []).filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name }))}
      />
      <p className="text-xs text-muted-foreground">{withPrices ? t("sales.scope.pricingHint") : t("sales.scope.templateLinesHint")}</p>

      <div className="space-y-4">
        {sections.fields.length === 0 ? <p className="text-sm text-muted-foreground">{t("sales.scope.empty")}</p> : null}
        {sections.fields.map((f, s) => (
          <div key={f.id} className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <TextField name={`${pre(name)}sections.${s}.title`} label={t("sales.scope.sectionTitle")} placeholder={t("sales.scope.sectionPlaceholder")} className="flex-1" dir="auto" />
              <RemoveButton className="mt-7" label={t("sales.scope.removeSection", { n: s + 1 })} onClick={() => sections.remove(s)} />
            </div>
            <ToggleField name={`${pre(name)}sections.${s}.outside`} label={t("sales.scope.outside")} />
            <SectionItems name={name} section={s} withPrices={withPrices} contractType={contractType} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={sections.fields.length >= 30} onClick={() => sections.append({ title: "", outside: false, items: [{ text: "", who: "INCLUDED", basis: "NONE", ratePaisa: null, quantity: null, materials: [] }] })}>
          <Plus data-icon="inline-start" />
          {t("sales.scope.addSection")}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("sales.scope.rates")}</p>
        <p className="text-xs text-muted-foreground">{t("sales.scope.ratesHint")}</p>
        {rates.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_11rem_auto] items-start gap-2">
            <TextField name={`${pre(name)}rates.${i}.label`} label={t("sales.scope.rateLabel")} hideLabel dir="auto" />
            <MoneyField name={`${pre(name)}rates.${i}.ratePerSqftPaisa`} label={t("sales.scope.rate")} hideLabel />
            <RemoveButton className="mt-1" label={t("sales.scope.removeRate", { n: i + 1 })} onClick={() => rates.remove(i)} />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={rates.fields.length >= 6} onClick={() => rates.append({ label: "", ratePerSqftPaisa: null })}>
            <Plus data-icon="inline-start" />
            {t("sales.scope.addRate")}
          </Button>
          {rateValues.length ? <span className="text-sm font-medium">{t("sales.scope.totalRate", { rate: formatPKR(rateTotal({ rates: rateValues })) })}</span> : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("sales.scope.baseRates")}</p>
        <p className="text-xs text-muted-foreground">{t("sales.scope.baseRatesHint")}</p>
        {baseRates.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_9rem_6rem_auto] items-start gap-2">
            <TextField name={`${pre(name)}baseRates.${i}.item`} label={t("sales.scope.baseItem")} hideLabel dir="auto" />
            <MoneyField name={`${pre(name)}baseRates.${i}.ratePaisa`} label={t("sales.scope.baseRate")} hideLabel />
            <TextField name={`${pre(name)}baseRates.${i}.unit`} label={t("sales.scope.baseUnit")} hideLabel />
            <RemoveButton className="mt-1" label={t("sales.scope.removeBaseRate", { n: i + 1 })} onClick={() => baseRates.remove(i)} />
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" disabled={baseRates.fields.length >= 20} onClick={() => baseRates.append({ item: "", ratePaisa: null, unit: "" })}>
          <Plus data-icon="inline-start" />
          {t("sales.scope.addBaseRate")}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">{t("sales.scope.terms")}</p>
        {terms.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2">
            <span className="pt-8 text-end text-xs text-muted-foreground tabular-nums">{i + 1}</span>
            <div className="space-y-2">
              <TextField name={`${pre(name)}terms.${i}.title`} label={t("sales.scope.termTitle")} dir="auto" />
              <TextareaField name={`${pre(name)}terms.${i}.text`} label={t("sales.scope.termText")} rows={2} />
            </div>
            <RemoveButton className="mt-7" label={t("sales.scope.removeTerm", { n: i + 1 })} onClick={() => terms.remove(i)} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={terms.fields.length >= 40} onClick={() => terms.append({ title: "", text: "" })}>
          <Plus data-icon="inline-start" />
          {t("sales.scope.addTerm")}
        </Button>
      </div>
    </div>
  );
}

/** Read-only view of a quotation's content (template preview, quote detail). */
export function ScopeList({ scope }: { scope: QuoteScopeContent }) {
  const t = useT();
  const priceText = usePriceText();
  const lineTotal = lineRateTotal(scope);
  return (
    <div className="space-y-4 text-sm">
      {lineTotal > BigInt(0) ? <p className="font-medium">{t("sales.scope.lineRateTotal", { rate: formatPKR(lineTotal) })}</p> : null}
      {scope.rates.length ? (
        <ul className="space-y-1 rounded-xl border p-3">
          {scope.rates.map((r, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span dir="auto">{r.label}</span>
              <span className="tabular-nums">{formatPKR(r.ratePerSqftPaisa)}</span>
            </li>
          ))}
          <li className="border-t pt-1 font-semibold">{t("sales.scope.totalRate", { rate: formatPKR(rateTotal(scope)) })}</li>
        </ul>
      ) : null}
      {scope.sections.map((s, i) => (
        <div key={i} className="space-y-1">
          <p className="font-semibold" dir="auto">
            {s.title}
          </p>
          <ul className="space-y-1">
            {s.items.map((it, j) => (
              <li key={j} className="flex items-start justify-between gap-3 border-b border-dashed py-1 last:border-0">
                <span dir="auto" className={cn(it.who !== "INCLUDED" && "opacity-45")}>
                  {it.text}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {it.price ? <span className={cn("text-xs tabular-nums", it.who !== "INCLUDED" && "text-muted-foreground line-through")}>{priceText(it.price)}</span> : null}
                  <WhoBadge who={it.who} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {scope.baseRates.length ? (
        <div className="space-y-1">
          <p className="font-semibold">{t("sales.scope.baseRates")}</p>
          <ul className="space-y-1">
            {scope.baseRates.map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span dir="auto">{r.item}</span>
                <span className="tabular-nums">
                  {formatPKR(r.ratePaisa)} / {r.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {scope.terms.length ? (
        <div className="space-y-1">
          <p className="font-semibold">{t("sales.scope.terms")}</p>
          <ol className="list-decimal space-y-1 ps-5">
            {scope.terms.map((x, i) => (
              <li key={i} dir="auto">
                {x.title ? <strong>{x.title} — </strong> : null}
                {x.text}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Quote form card: pick the quotation template (the default of the contract type first), see it,
 * or "Edit for this quote" to give this quote its own copy. A template with line prices prices the
 * quote: the included lines + material at the price list of the quality category.
 */
export function QuoteScopeCard() {
  const t = useT();
  const seesPrice = useCan("fields.contract");
  const { setValue } = useFormContext();
  const [custom, contractType, templateId, covered] = useWatch({ name: ["scopeCustom", "contractType", "scopeTemplateId", "coveredAreaSqft"] }) as [boolean, QuoteContractType, string | null, number | null];
  const list = useGetQuoteTemplatesQuery();
  const workRates = useGetQuoteWorkRatesQuery();
  const ofType = useMemo(() => (list.data?.templates ?? []).filter((x) => x.contractType === contractType), [list.data, contractType]);
  const template = ofType.find((x) => x.id === templateId) ?? ofType.find((x) => x.isDefault) ?? ofType[0] ?? null;
  // a template of another contract type no longer applies
  useEffect(() => {
    if (templateId && list.data && !ofType.some((x) => x.id === templateId)) setValue("scopeTemplateId", null);
  }, [templateId, ofType, list.data, setValue]);

  const customise = () => {
    if (!template) return;
    setValue("scope", scopeBody(withWorkRates(template, workRates.data?.rates, contractType)), { shouldDirty: true });
    setValue("scopeCustom", true, { shouldDirty: true });
  };
  const back = () => {
    setValue("scopeCustom", false, { shouldDirty: true });
    setValue("scope", null, { shouldDirty: true });
  };
  const total = template ? rateTotal(template) : BigInt(0);
  const useRate = () => {
    if (!covered || total <= BigInt(0)) return;
    setValue("finalPricePaisa", String((total * BigInt(Math.round(covered * 100))) / BigInt(100)), { shouldDirty: true });
    toast.success(t("sales.scope.useRateDone"));
  };
  const priced = template ? withWorkRates(template, workRates.data?.rates, contractType).sections.some((s) => s.items.some((i) => i.price)) : false;
  return (
    <SectionCard
      title={t("sales.scope.title")}
      description={t("sales.scope.desc")}
      actions={
        custom ? (
          <Button type="button" variant="outline" size="sm" onClick={back}>
            <RotateCcw data-icon="inline-start" />
            {t("sales.scope.backToTemplate")}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={customise} disabled={!template}>
            <Pencil data-icon="inline-start" />
            {t("sales.scope.customise")}
          </Button>
        )
      }
    >
      {custom ? (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{t("sales.scope.customHint")}</p>
          <ScopeFields name="scope" />
        </>
      ) : !template ? (
        <p className="text-sm text-muted-foreground">{t("sales.scope.none")}</p>
      ) : (
        <div className="space-y-3">
          <SelectField
            name="scopeTemplateId"
            label={t("sales.scope.template")}
            hint={t("sales.scope.templateHint")}
            placeholder={template.name}
            options={ofType.map((x) => ({ value: x.id, label: x.isDefault ? `${x.name} · ${t("sales.scope.defaultBadge")}` : x.name }))}
          />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5" aria-hidden />
            {t("sales.scope.counts", counts(template))}
            {priced ? ` · ${t("sales.scope.pricedByLine")}` : ""}
          </p>
          {seesPrice && total > BigInt(0) && !priced ? (
            <Button type="button" variant="secondary" size="sm" onClick={useRate} disabled={!covered}>
              <Calculator data-icon="inline-start" />
              {t("sales.scope.useRate", { rate: formatPKR(total) })}
            </Button>
          ) : null}
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-medium" dir="auto">
              {template.name}
            </summary>
            <div className="mt-3">
              <ScopeList scope={withWorkRates(template, workRates.data?.rates, contractType)} />
            </div>
          </details>
        </div>
      )}
    </SectionCard>
  );
}
