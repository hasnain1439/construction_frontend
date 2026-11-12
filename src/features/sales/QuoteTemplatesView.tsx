"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useGetQuoteScopeTemplatesQuery, useResetQuoteScopeTemplateMutation, useSaveQuoteScopeTemplateMutation } from "@/api/services/sales.api";
import type { QuoteContractType, QuoteScope } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { Form } from "@/components/forms/Form";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { scopeBody, ScopeFields, ScopeList, scopeSchema } from "./ScopeEditor";

const TYPES: QuoteContractType[] = ["LABOR_ONLY", "GREY_OWNER_FINISHING", "FULL"];
const formSchema = scopeSchema;
type Values = z.input<typeof formSchema>;

function TemplateForm({ contractType, template, canEdit }: { contractType: QuoteContractType; template: QuoteScope; canEdit: boolean }) {
  const t = useT();
  const run = useMutationToast();
  const [save, saving] = useSaveQuoteScopeTemplateMutation();
  const [reset, resetting] = useResetQuoteScopeTemplateMutation();
  const [confirm, setConfirm] = useState(false);
  const form = useForm<Values, unknown, z.output<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: scopeBody(template) });
  const onSubmit = async (v: z.output<typeof formSchema>) => {
    const res = await run(() => save({ contractType, body: v }).unwrap(), { success: () => t("sales.scope.saved") });
    if (res) form.reset(scopeBody(res));
  };
  const doReset = async () => {
    const res = await run(() => reset(contractType).unwrap(), { success: () => t("sales.scope.resetDone") });
    setConfirm(false);
    if (res) form.reset(scopeBody(res));
  };
  const badge = template.source === "COMPANY" ? t("sales.scope.fromCompany") : t("sales.scope.fromDefault");
  if (!canEdit) {
    return (
      <SectionCard title={badge}>
        <ScopeList scope={template} />
      </SectionCard>
    );
  }
  return (
    <SectionCard
      title={badge}
      actions={
        <div className="flex flex-wrap gap-2">
          {template.source === "COMPANY" ? (
            <Button type="button" variant="outline" onClick={() => setConfirm(true)} disabled={resetting.isLoading}>
              <RotateCcw data-icon="inline-start" />
              {t("sales.scope.reset")}
            </Button>
          ) : null}
          <Button type="submit" form={`scope-${contractType}`} disabled={saving.isLoading}>
            <Save data-icon="inline-start" />
            {t("sales.scope.save")}
          </Button>
        </div>
      }
    >
      <Form form={form} onSubmit={onSubmit} id={`scope-${contractType}`}>
        <ScopeFields name="" />
      </Form>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={t("sales.scope.reset")} description={t("sales.scope.resetConfirm")} confirmLabel={t("sales.scope.reset")} loading={resetting.isLoading} onConfirm={() => void doReset()} />
    </SectionCard>
  );
}

/** Sales → Quotation templates: the work list + notes each new quote starts with, per contract type. */
export function QuoteTemplatesView() {
  const t = useT();
  const enumT = useEnumT();
  const readOnly = useReadOnly();
  const canEdit = useCan("sales.quote.manage") && !readOnly;
  const query = useGetQuoteScopeTemplatesQuery();
  return (
    <>
      <PageHeader title={t("sales.scope.templatesTitle")} description={t("sales.scope.templatesDesc")} breadcrumbs={[{ label: t("crumb.sales") }, { label: t("sales.scope.templatesTitle") }]} />
      <QueryState query={query}>
        {(templates) => (
          <Tabs defaultValue="LABOR_ONLY" className="gap-4">
            <TabsList className="max-w-full overflow-x-auto">
              {TYPES.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {enumT("projectContractType", k)}
                </TabsTrigger>
              ))}
            </TabsList>
            {TYPES.map((k) => (
              <TabsContent key={k} value={k}>
                <TemplateForm key={`${k}:${templates[k].source}`} contractType={k} template={templates[k]} canEdit={canEdit} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </QueryState>
    </>
  );
}
