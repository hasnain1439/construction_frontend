"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  useCreateQuoteTemplateMutation,
  useDeleteQuoteTemplateMutation,
  useGetQuoteTemplatesQuery,
  useGetQuoteWorkRatesQuery,
  useResetQuoteTemplatesMutation,
  useResetQuoteWorkRatesMutation,
  useSaveQuoteWorkRatesMutation,
  useUpdateQuoteTemplateMutation,
} from "@/api/services/sales.api";
import type { QuoteContractType, QuoteTemplate, QuoteTemplateBody, QuoteTemplateList, QuoteWorkRate, QuoteWorkRates } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid, Form } from "@/components/forms/Form";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { msg } from "@/i18n/message";
import { useEnumT, useT } from "@/i18n/useT";
import { formatPKR } from "@/lib/money";
import { MaterialsField, lineRateTotal, rateTotal, scopeBody, scopeContentFields, ScopeFields, scopeFromForm, ScopeList, withWorkRates } from "./ScopeEditor";

const TYPES: QuoteContractType[] = ["LABOR_ONLY", "GREY_OWNER_FINISHING", "FULL"];
const formSchema = z.object({ contractType: z.enum(["FULL", "GREY_OWNER_FINISHING", "LABOR_ONLY"]), isDefault: z.boolean(), ...scopeContentFields });
type Values = z.input<typeof formSchema>;

const valuesOf = (t: QuoteTemplateBody): Values => {
  const { templateId: _ignored, ...content } = scopeBody(t);
  return { contractType: t.contractType, isDefault: t.isDefault, ...content };
};
const EMPTY: QuoteTemplateBody = { contractType: "GREY_OWNER_FINISHING", isDefault: false, name: "", sections: [], rates: [], baseRates: [], terms: [] };

/** The template's lines: only the work and who does it; the price shown is the work rate of that name. */
function TemplateLines() {
  const contractType = useWatch({ name: "contractType" }) as QuoteContractType;
  return <ScopeFields name="" withPrices={false} contractType={contractType} />;
}

/** Edit (or add) one template. */
function TemplateEditor({ template, onDone }: { template: { id: string | null; body: QuoteTemplateBody }; onDone: () => void }) {
  const t = useT();
  const enumT = useEnumT();
  const run = useMutationToast();
  const [create, creating] = useCreateQuoteTemplateMutation();
  const [update, updating] = useUpdateQuoteTemplateMutation();
  const form = useForm<Values, unknown, z.output<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: valuesOf(template.body) });
  const onSubmit = async (v: z.output<typeof formSchema>) => {
    const { contractType, isDefault, ...content } = v as unknown as Values;
    const { templateId: _t, ...scope } = scopeFromForm({ ...content, templateId: null });
    const body: QuoteTemplateBody = { contractType, isDefault, ...scope };
    const res = await run(() => (template.id ? update({ id: template.id, body }).unwrap() : create(body).unwrap()), { success: () => t("sales.scope.saved") });
    if (res) onDone();
  };
  return (
    <SectionCard
      title={template.id ? template.body.name : t("sales.scope.addTemplate")}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            {t("sales.scope.cancel")}
          </Button>
          <Button type="submit" form="quote-template" disabled={creating.isLoading || updating.isLoading}>
            <Save data-icon="inline-start" />
            {t("sales.scope.save")}
          </Button>
        </div>
      }
    >
      <Form form={form} onSubmit={onSubmit} id="quote-template">
        <FieldGrid className="mb-6">
          <SelectField name="contractType" label={t("sales.scope.contractType")} options={TYPES.map((k) => ({ value: k, label: enumT("projectContractType", k) }))} />
          <ToggleField name="isDefault" label={t("sales.scope.isDefault")} />
        </FieldGrid>
        <TemplateLines />
      </Form>
    </SectionCard>
  );
}

function TemplateCard({ tpl, rates, canEdit, onEdit, onCopy, onRemove }: { tpl: QuoteTemplate; rates: QuoteWorkRate[] | undefined; canEdit: boolean; onEdit: () => void; onCopy: () => void; onRemove: () => void }) {
  const t = useT();
  const priced = withWorkRates(tpl, rates, tpl.contractType);
  const total = rateTotal(tpl) || lineRateTotal(priced);
  const items = tpl.sections.reduce((a, s) => a + s.items.length, 0);
  return (
    <div className="space-y-2 rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold" dir="auto">
            {tpl.name}
            {tpl.isDefault ? <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t("sales.scope.defaultBadge")}</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("sales.scope.counts", { n: tpl.sections.length, items, terms: tpl.terms.length })}
            {total > BigInt(0) ? ` · ${t("sales.scope.totalRate", { rate: formatPKR(total) })}` : ""}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil data-icon="inline-start" />
              {t("sales.scope.edit")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
              <Copy data-icon="inline-start" />
              {t("sales.scope.duplicate")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`${t("sales.scope.remove")} ${tpl.name}`}>
              <Trash2 />
            </Button>
          </div>
        ) : null}
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">{t("sales.scope.title")}</summary>
        <div className="mt-3">
          <ScopeList scope={priced} />
        </div>
      </details>
    </div>
  );
}

const BASIS: Array<QuoteWorkRate["basis"]> = ["SQFT", "UNIT", "LUMP_SUM"];
const ratesSchema = z.object({
  rates: z
    .array(
      z.object({
        name: z.string().trim().min(1, msg("validation.required", { label: "sales.scope.workName" })).max(400),
        basis: z.enum(["SQFT", "UNIT", "LUMP_SUM"]),
        ratePaisa: z.string().nullable(),
        labourRatePaisa: z.string().nullable(),
        unit: z.string().trim().max(20).nullable().optional(),
        materials: z.array(z.string()),
      }),
    )
    .max(400),
});
type RatesValues = z.input<typeof ratesSchema>;

/** Work rates: the price of each work line, by name (one rate with material, one labour only). */
function WorkRatesEditor({ data, canEdit }: { data: QuoteWorkRates; canEdit: boolean }) {
  const t = useT();
  const run = useMutationToast();
  const [save, saving] = useSaveQuoteWorkRatesMutation();
  const [reset, resetting] = useResetQuoteWorkRatesMutation();
  const [confirm, setConfirm] = useState(false);
  const form = useForm<RatesValues, unknown, z.output<typeof ratesSchema>>({ resolver: zodResolver(ratesSchema), defaultValues: { rates: data.rates.map((r) => ({ ...r, materials: [...r.materials] })) } });
  const rows = useFieldArray({ control: form.control, name: "rates" });
  const bases = useWatch({ control: form.control, name: "rates" });
  const basisOptions = BASIS.map((b) => ({ value: b, label: t(`sales.scope.basis.${b}`) }));
  const onSubmit = async (v: z.output<typeof ratesSchema>) => {
    const res = await run(() => save(v.rates.map((r) => ({ ...r, ratePaisa: r.ratePaisa || null, labourRatePaisa: r.labourRatePaisa || null, unit: r.basis === "UNIT" && r.unit?.trim() ? r.unit.trim() : null })) as QuoteWorkRate[]).unwrap(), { success: () => t("sales.scope.ratesSaved") });
    if (res) form.reset({ rates: res.rates.map((r) => ({ ...r, materials: [...r.materials] })) });
  };
  return (
    <SectionCard
      title={t("sales.scope.workRatesTab")}
      description={t("sales.scope.workRatesDesc")}
      actions={
        canEdit ? (
          <div className="flex flex-wrap gap-2">
            {data.source === "COMPANY" ? (
              <Button type="button" variant="outline" onClick={() => setConfirm(true)} disabled={resetting.isLoading}>
                <RotateCcw data-icon="inline-start" />
                {t("sales.scope.resetRates")}
              </Button>
            ) : null}
            <Button type="submit" form="work-rates" disabled={saving.isLoading}>
              <Save data-icon="inline-start" />
              {t("sales.scope.saveRates")}
            </Button>
          </div>
        ) : null
      }
    >
      {data.source === "DEFAULT" ? <InlineAlert tone="info" className="mb-4">{t("sales.scope.ratesBuiltIn")}</InlineAlert> : null}
      <Form form={form} onSubmit={onSubmit} id="work-rates">
        <fieldset disabled={!canEdit} className="space-y-2">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_8rem_14rem_2.25rem] gap-2 text-xs font-medium text-muted-foreground md:grid">
            <span>{t("sales.scope.workName")}</span>
            <span>{t("sales.scope.priceBasis")}</span>
            <span>{t("sales.scope.rateWithMaterial")}</span>
            <span>{t("sales.scope.rateLabour")}</span>
            <span>{t("sales.scope.baseItem")}</span>
            <span />
          </div>
          {rows.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-1 items-start gap-2 border-b border-dashed pb-2 md:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem_14rem_2.25rem]">
              <TextField name={`rates.${i}.name`} label={t("sales.scope.workName")} hideLabel dir="auto" />
              <div className="space-y-1">
                <SelectField name={`rates.${i}.basis`} label={t("sales.scope.priceBasis")} hideLabel options={basisOptions} />
                {bases?.[i]?.basis === "UNIT" ? <TextField name={`rates.${i}.unit`} label={t("sales.scope.unitName")} hideLabel placeholder={t("sales.scope.unitNamePlaceholder")} /> : null}
              </div>
              <MoneyField name={`rates.${i}.ratePaisa`} label={t("sales.scope.rateWithMaterial")} hideLabel />
              <MoneyField name={`rates.${i}.labourRatePaisa`} label={t("sales.scope.rateLabour")} hideLabel />
              <div className="min-w-0 pt-0.5 [&_button]:w-full">
                <MaterialsField name={`rates.${i}.materials`} />
              </div>
              {canEdit ? (
                <Button type="button" variant="ghost" size="icon-sm" className="mt-1" onClick={() => rows.remove(i)} aria-label={t("sales.scope.removeWorkRate", { n: i + 1 })}>
                  <Trash2 />
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" disabled={rows.fields.length >= 400} onClick={() => rows.append({ name: "", basis: "SQFT", ratePaisa: null, labourRatePaisa: null, unit: null, materials: [] })}>
              <Plus data-icon="inline-start" />
              {t("sales.scope.addWorkRate")}
            </Button>
          ) : null}
        </fieldset>
      </Form>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("sales.scope.resetRates")}
        description={t("sales.scope.resetRatesConfirm")}
        confirmLabel={t("sales.scope.resetRates")}
        loading={resetting.isLoading}
        onConfirm={() =>
          void run(() => reset().unwrap(), { success: () => t("sales.scope.ratesReset") }).then((res) => {
            setConfirm(false);
            if (res) form.reset({ rates: res.rates.map((r) => ({ ...r, materials: [...r.materials] })) });
          })
        }
      />
    </SectionCard>
  );
}

function TemplatesBody({ list, canEdit }: { list: QuoteTemplateList; canEdit: boolean }) {
  const t = useT();
  const enumT = useEnumT();
  const run = useMutationToast();
  const [editing, setEditing] = useState<{ id: string | null; body: QuoteTemplateBody } | null>(null);
  const [removing, setRemoving] = useState<QuoteTemplate | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [tab, setTab] = useState<QuoteContractType | "RATES">("LABOR_ONLY");
  const workRates = useGetQuoteWorkRatesQuery();
  const [remove, removeState] = useDeleteQuoteTemplateMutation();
  const [reset, resetState] = useResetQuoteTemplatesMutation();
  const body = ({ id: _id, ...rest }: QuoteTemplate): QuoteTemplateBody => rest;

  if (editing) return <TemplateEditor key={editing.id ?? "new"} template={editing} onDone={() => setEditing(null)} />;
  return (
    <div className="space-y-6">
      {list.source === "DEFAULT" ? <InlineAlert tone="info">{t("sales.scope.builtIn")}</InlineAlert> : null}
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEditing({ id: null, body: { ...EMPTY, contractType: tab === "RATES" ? "GREY_OWNER_FINISHING" : tab } })}>
            <Plus data-icon="inline-start" />
            {t("sales.scope.addTemplate")}
          </Button>
          {list.source === "COMPANY" ? (
            <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
              <RotateCcw data-icon="inline-start" />
              {t("sales.scope.resetAll")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <Tabs value={tab} onValueChange={(v) => setTab(v as QuoteContractType | "RATES")} className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          {TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {enumT("projectContractType", type)} ({list.templates.filter((x) => x.contractType === type).length})
            </TabsTrigger>
          ))}
          <TabsTrigger value="RATES">{t("sales.scope.workRatesTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="RATES">{workRates.data ? <WorkRatesEditor key={workRates.data.source} data={workRates.data} canEdit={canEdit} /> : null}</TabsContent>
        {TYPES.map((type) => {
          const ofType = list.templates.filter((x) => x.contractType === type);
          return (
            <TabsContent key={type} value={type} className="space-y-3">
              {ofType.length ? (
                ofType.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
                    rates={workRates.data?.rates}
                    canEdit={canEdit}
                    onEdit={() => setEditing({ id: tpl.id, body: body(tpl) })}
                    onCopy={() => setEditing({ id: null, body: { ...body(tpl), isDefault: false, name: t("sales.scope.copyOf", { name: tpl.name }).slice(0, 80) } })}
                    onRemove={() => setRemoving(tpl)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("sales.scope.noneOfType")}</p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => (!o ? setRemoving(null) : undefined)}
        title={t("sales.scope.remove")}
        description={removing ? t("sales.scope.removeConfirm", { name: removing.name }) : ""}
        confirmLabel={t("sales.scope.remove")}
        loading={removeState.isLoading}
        onConfirm={() => void run(() => remove(removing!.id).unwrap(), { success: () => t("sales.scope.removed") }).then(() => setRemoving(null))}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t("sales.scope.resetAll")}
        description={t("sales.scope.resetAllConfirm")}
        confirmLabel={t("sales.scope.resetAll")}
        loading={resetState.isLoading}
        onConfirm={() => void run(() => reset().unwrap(), { success: () => t("sales.scope.resetDone") }).then(() => setResetOpen(false))}
      />
    </div>
  );
}

/** Sales → Quotation templates: ready quotations (work list, rate parts, base rates, notes) per contract type. */
export function QuoteTemplatesView() {
  const t = useT();
  const readOnly = useReadOnly();
  const canEdit = useCan("sales.quote.manage") && !readOnly;
  const query = useGetQuoteTemplatesQuery();
  return (
    <>
      <PageHeader title={t("sales.scope.templatesTitle")} description={t("sales.scope.templatesDesc")} breadcrumbs={[{ label: t("crumb.sales") }, { label: t("sales.scope.templatesTitle") }]} />
      <QueryState query={query}>{(list) => <TemplatesBody list={list as QuoteTemplateList} canEdit={canEdit} />}</QueryState>
    </>
  );
}
