"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateQuoteTemplateMutation, useDeleteQuoteTemplateMutation, useGetQuoteTemplatesQuery, useResetQuoteTemplatesMutation, useUpdateQuoteTemplateMutation } from "@/api/services/sales.api";
import type { QuoteContractType, QuoteTemplate, QuoteTemplateBody, QuoteTemplateList } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid, Form } from "@/components/forms/Form";
import { SelectField } from "@/components/forms/SelectField";
import { ToggleField } from "@/components/forms/ToggleField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { formatPKR } from "@/lib/money";
import { lineRateTotal, rateTotal, scopeBody, scopeContentFields, ScopeFields, scopeFromForm, ScopeList } from "./ScopeEditor";

const TYPES: QuoteContractType[] = ["LABOR_ONLY", "GREY_OWNER_FINISHING", "FULL"];
const formSchema = z.object({ contractType: z.enum(["FULL", "GREY_OWNER_FINISHING", "LABOR_ONLY"]), isDefault: z.boolean(), ...scopeContentFields });
type Values = z.input<typeof formSchema>;

const valuesOf = (t: QuoteTemplateBody): Values => {
  const { templateId: _ignored, ...content } = scopeBody(t);
  return { contractType: t.contractType, isDefault: t.isDefault, ...content };
};
const EMPTY: QuoteTemplateBody = { contractType: "GREY_OWNER_FINISHING", isDefault: false, name: "", sections: [], rates: [], baseRates: [], terms: [] };

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
        <ScopeFields name="" />
      </Form>
    </SectionCard>
  );
}

function TemplateCard({ tpl, canEdit, onEdit, onCopy, onRemove }: { tpl: QuoteTemplate; canEdit: boolean; onEdit: () => void; onCopy: () => void; onRemove: () => void }) {
  const t = useT();
  const total = rateTotal(tpl) || lineRateTotal(tpl);
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
          <ScopeList scope={tpl} />
        </div>
      </details>
    </div>
  );
}

function TemplatesBody({ list, canEdit }: { list: QuoteTemplateList; canEdit: boolean }) {
  const t = useT();
  const enumT = useEnumT();
  const run = useMutationToast();
  const [editing, setEditing] = useState<{ id: string | null; body: QuoteTemplateBody } | null>(null);
  const [removing, setRemoving] = useState<QuoteTemplate | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [tab, setTab] = useState<QuoteContractType>("LABOR_ONLY");
  const [remove, removeState] = useDeleteQuoteTemplateMutation();
  const [reset, resetState] = useResetQuoteTemplatesMutation();
  const body = ({ id: _id, ...rest }: QuoteTemplate): QuoteTemplateBody => rest;

  if (editing) return <TemplateEditor key={editing.id ?? "new"} template={editing} onDone={() => setEditing(null)} />;
  return (
    <div className="space-y-6">
      {list.source === "DEFAULT" ? <InlineAlert tone="info">{t("sales.scope.builtIn")}</InlineAlert> : null}
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setEditing({ id: null, body: { ...EMPTY, contractType: tab } })}>
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
      <Tabs value={tab} onValueChange={(v) => setTab(v as QuoteContractType)} className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          {TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {enumT("projectContractType", type)} ({list.templates.filter((x) => x.contractType === type).length})
            </TabsTrigger>
          ))}
        </TabsList>
        {TYPES.map((type) => {
          const ofType = list.templates.filter((x) => x.contractType === type);
          return (
            <TabsContent key={type} value={type} className="space-y-3">
              {ofType.length ? (
                ofType.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    tpl={tpl}
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
