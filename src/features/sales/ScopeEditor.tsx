"use client";

import { Calculator, FileText, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useGetQuoteTemplatesQuery } from "@/api/services/sales.api";
import type { QuoteContractType, QuoteScopeBody, QuoteScopeContent, QuoteScopeWho } from "@/api/types";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { msg } from "@/i18n/message";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatPKR } from "@/lib/money";
import { paisaSchema } from "@/lib/validation";

export const SCOPE_WHO: QuoteScopeWho[] = ["INCLUDED", "OWNER", "EXCLUDED"];
const required = (label: string, max: number) => z.string().trim().min(1, msg("validation.required", { label })).max(max, msg("validation.tooLongPlain"));

/** Form fields of a quotation's content (same limits as the API). */
export const scopeContentFields = {
  name: required("sales.scope.name", 80),
  sections: z
    .array(z.object({ title: required("sales.scope.sectionTitle", 120), items: z.array(z.object({ text: required("sales.scope.item", 400), who: z.enum(["INCLUDED", "OWNER", "EXCLUDED"]) })).max(60) }))
    .max(30),
  rates: z.array(z.object({ label: required("sales.scope.rateLabel", 80), ratePerSqftPaisa: paisaSchema("sales.scope.rate") })).max(6),
  baseRates: z.array(z.object({ item: required("sales.scope.baseItem", 160), ratePaisa: paisaSchema("sales.scope.baseRate"), unit: required("sales.scope.baseUnit", 20) })).max(20),
  terms: z.array(z.object({ title: z.string().trim().max(120), text: required("sales.scope.termText", 1000) })).max(40),
};
export const scopeSchema = z.object({ templateId: z.string().nullable().optional(), ...scopeContentFields });

/** A plain copy of a quotation's content for a form / request. */
export const scopeBody = (s: QuoteScopeContent & { templateId?: string | null; id?: string }): QuoteScopeBody => ({
  templateId: s.templateId ?? s.id ?? null,
  name: s.name,
  sections: s.sections.map((x) => ({ title: x.title, items: x.items.map((i) => ({ text: i.text, who: i.who })) })),
  rates: s.rates.map((r) => ({ label: r.label, ratePerSqftPaisa: r.ratePerSqftPaisa })),
  baseRates: s.baseRates.map((r) => ({ item: r.item, ratePaisa: r.ratePaisa, unit: r.unit })),
  terms: s.terms.map((x) => ({ title: x.title, text: x.text })),
});

/** Sum of the rate parts (paisa). */
export const rateTotal = (s: { rates: Array<{ ratePerSqftPaisa: string | null }> }) => s.rates.reduce((a, r) => a + BigInt(r.ratePerSqftPaisa || "0"), BigInt(0));
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

function RemoveButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" className={className} onClick={onClick} aria-label={label}>
      <Trash2 />
    </Button>
  );
}

function SectionItems({ name, section }: { name: string; section: number }) {
  const t = useT();
  const { fields, append, remove } = useFieldArray({ name: `${pre(name)}sections.${section}.items` });
  const whoOptions = SCOPE_WHO.map((w) => ({ value: w, label: t(`sales.scope.whoLabel.${w}`) }));
  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_10rem_auto] items-start gap-2">
          <span className="pt-2 text-end text-xs text-muted-foreground tabular-nums">{i + 1}</span>
          <TextField name={`${pre(name)}sections.${section}.items.${i}.text`} label={t("sales.scope.item")} hideLabel dir="auto" />
          <SelectField name={`${pre(name)}sections.${section}.items.${i}.who`} label={t("sales.scope.who")} hideLabel options={whoOptions} />
          <RemoveButton className="mt-1" label={t("sales.scope.removeItem")} onClick={() => remove(i)} />
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" disabled={fields.length >= 60} onClick={() => append({ text: "", who: "INCLUDED" })}>
        <Plus data-icon="inline-start" />
        {t("sales.scope.addItem")}
      </Button>
    </div>
  );
}

/** Editable name, rate parts, sections → items, material base rates and notes, under `name`. */
export function ScopeFields({ name }: { name: string }) {
  const t = useT();
  const sections = useFieldArray({ name: `${pre(name)}sections` });
  const rates = useFieldArray({ name: `${pre(name)}rates` });
  const baseRates = useFieldArray({ name: `${pre(name)}baseRates` });
  const terms = useFieldArray({ name: `${pre(name)}terms` });
  const rateValues = (useWatch({ name: `${pre(name)}rates` }) ?? []) as Array<{ ratePerSqftPaisa: string | null }>;
  return (
    <div className="space-y-6">
      <TextField name={`${pre(name)}name`} label={t("sales.scope.name")} placeholder={t("sales.scope.namePlaceholder")} required dir="auto" />

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

      <div className="space-y-4">
        {sections.fields.length === 0 ? <p className="text-sm text-muted-foreground">{t("sales.scope.empty")}</p> : null}
        {sections.fields.map((f, s) => (
          <div key={f.id} className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <TextField name={`${pre(name)}sections.${s}.title`} label={t("sales.scope.sectionTitle")} placeholder={t("sales.scope.sectionPlaceholder")} className="flex-1" dir="auto" />
              <RemoveButton className="mt-7" label={t("sales.scope.removeSection", { n: s + 1 })} onClick={() => sections.remove(s)} />
            </div>
            <SectionItems name={name} section={s} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={sections.fields.length >= 30} onClick={() => sections.append({ title: "", items: [{ text: "", who: "INCLUDED" }] })}>
          <Plus data-icon="inline-start" />
          {t("sales.scope.addSection")}
        </Button>
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
  return (
    <div className="space-y-4 text-sm">
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
                <span dir="auto">{it.text}</span>
                <WhoBadge who={it.who} />
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
 * set the agreed price from its rate, or "Edit for this quote" to give this quote its own copy.
 */
export function QuoteScopeCard() {
  const t = useT();
  const seesPrice = useCan("fields.contract");
  const { setValue } = useFormContext();
  const [custom, contractType, templateId, covered] = useWatch({ name: ["scopeCustom", "contractType", "scopeTemplateId", "coveredAreaSqft"] }) as [boolean, QuoteContractType, string | null, number | null];
  const list = useGetQuoteTemplatesQuery();
  const ofType = useMemo(() => (list.data?.templates ?? []).filter((x) => x.contractType === contractType), [list.data, contractType]);
  const template = ofType.find((x) => x.id === templateId) ?? ofType.find((x) => x.isDefault) ?? ofType[0] ?? null;
  // a template of another contract type no longer applies
  useEffect(() => {
    if (templateId && list.data && !ofType.some((x) => x.id === templateId)) setValue("scopeTemplateId", null);
  }, [templateId, ofType, list.data, setValue]);

  const customise = () => {
    if (!template) return;
    setValue("scope", scopeBody(template), { shouldDirty: true });
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
          </p>
          {seesPrice && total > BigInt(0) ? (
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
              <ScopeList scope={template} />
            </div>
          </details>
        </div>
      )}
    </SectionCard>
  );
}
