"use client";

import { FileText, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { z } from "zod";
import { useGetQuoteScopeTemplatesQuery } from "@/api/services/sales.api";
import type { QuoteContractType, QuoteScopeBody, QuoteScopeWho } from "@/api/types";
import { SectionCard } from "@/components/common/SectionCard";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { msg } from "@/i18n/message";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

export const SCOPE_WHO: QuoteScopeWho[] = ["INCLUDED", "OWNER", "EXCLUDED"];
const required = (label: string, max: number) => z.string().trim().min(1, msg("validation.required", { label })).max(max, msg("validation.tooLongPlain"));

/** Form schema of a scope (same limits as the API). */
export const scopeSchema = z.object({
  sections: z
    .array(z.object({ title: required("sales.scope.sectionTitle", 120), items: z.array(z.object({ text: required("sales.scope.item", 400), who: z.enum(["INCLUDED", "OWNER", "EXCLUDED"]) })).max(60) }))
    .max(30),
  terms: z.array(z.object({ title: z.string().trim().max(120), text: required("sales.scope.termText", 1000) })).max(40),
});

/** A plain copy (no source) of a scope for the form / request. */
export const scopeBody = (s: QuoteScopeBody): QuoteScopeBody => ({
  sections: s.sections.map((x) => ({ title: x.title, items: x.items.map((i) => ({ text: i.text, who: i.who })) })),
  terms: s.terms.map((x) => ({ title: x.title, text: x.text })),
});

/** Field path prefix: "" (the form is the scope) or "scope." */
const pre = (name: string) => (name ? `${name}.` : "");

const WHO_TONE: Record<QuoteScopeWho, string> = {
  INCLUDED: "bg-success-soft text-success",
  OWNER: "bg-warning-soft text-warning",
  EXCLUDED: "bg-danger-soft text-danger",
};

export function WhoBadge({ who }: { who: QuoteScopeWho }) {
  const t = useT();
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", WHO_TONE[who])}>{t(`sales.scope.whoLabel.${who}`)}</span>;
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
          <Button type="button" variant="ghost" size="icon-sm" className="mt-1" onClick={() => remove(i)} aria-label={t("sales.scope.removeItem")}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" disabled={fields.length >= 60} onClick={() => append({ text: "", who: "INCLUDED" })}>
        <Plus data-icon="inline-start" />
        {t("sales.scope.addItem")}
      </Button>
    </div>
  );
}

/** Editable sections → items (each included / by owner / not included) and numbered notes, under `name`. */
export function ScopeFields({ name }: { name: string }) {
  const t = useT();
  const sections = useFieldArray({ name: `${pre(name)}sections` });
  const terms = useFieldArray({ name: `${pre(name)}terms` });
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {sections.fields.length === 0 ? <p className="text-sm text-muted-foreground">{t("sales.scope.empty")}</p> : null}
        {sections.fields.map((f, s) => (
          <div key={f.id} className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <TextField name={`${pre(name)}sections.${s}.title`} label={t("sales.scope.sectionTitle")} placeholder={t("sales.scope.sectionPlaceholder")} className="flex-1" dir="auto" />
              <Button type="button" variant="ghost" size="icon-sm" className="mt-7" onClick={() => sections.remove(s)} aria-label={t("sales.scope.removeSection", { n: s + 1 })}>
                <Trash2 />
              </Button>
            </div>
            <SectionItems name={name} section={s} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={sections.fields.length >= 30} onClick={() => sections.append({ title: "", items: [{ text: "", who: "INCLUDED" }] })}>
          <Plus data-icon="inline-start" />
          {t("sales.scope.addSection")}
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
            <Button type="button" variant="ghost" size="icon-sm" className="mt-7" onClick={() => terms.remove(i)} aria-label={t("sales.scope.removeTerm", { n: i + 1 })}>
              <Trash2 />
            </Button>
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

/** Read-only list (template preview on the quote form, quote detail). */
export function ScopeList({ scope }: { scope: QuoteScopeBody }) {
  const t = useT();
  return (
    <div className="space-y-4 text-sm">
      {scope.sections.map((s, i) => (
        <div key={i} className="space-y-1">
          <p className="font-semibold">{s.title}</p>
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

const counts = (s: QuoteScopeBody) => ({ n: s.sections.length, items: s.sections.reduce((a, x) => a + x.items.length, 0), terms: s.terms.length });

/**
 * Quote form card: the company template of the contract type (read-only), or "Edit for this quote"
 * which copies it into the form (`scopeCustom` + `scope`) so this quote gets its own list.
 */
export function QuoteScopeCard() {
  const t = useT();
  const enumT = useEnumT();
  const { setValue } = useFormContext();
  const [custom, contractType] = useWatch({ name: ["scopeCustom", "contractType"] }) as [boolean, QuoteContractType];
  const templates = useGetQuoteScopeTemplatesQuery();
  const template = templates.data?.[contractType];
  const customise = () => {
    if (!template) return;
    setValue("scope", scopeBody(template), { shouldDirty: true });
    setValue("scopeCustom", true, { shouldDirty: true });
  };
  const back = () => {
    setValue("scopeCustom", false, { shouldDirty: true });
    setValue("scope", null, { shouldDirty: true });
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
      ) : template ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5" aria-hidden />
            {t("sales.scope.useTemplateHint", { contract: enumT("projectContractType", contractType) })} · {t("sales.scope.sections", counts(template))}
          </p>
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-medium">{template.source === "COMPANY" ? t("sales.scope.fromCompany") : t("sales.scope.fromDefault")}</summary>
            <div className="mt-3">
              <ScopeList scope={template} />
            </div>
          </details>
        </div>
      ) : null}
    </SectionCard>
  );
}
