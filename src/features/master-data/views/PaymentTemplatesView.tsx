"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileStack, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  useCreatePaymentTemplateMutation,
  useDeletePaymentTemplateMutation,
  useGetPaymentTemplatesQuery,
  useUpdatePaymentTemplateMutation,
} from "@/api/services/masterData.api";
import type { PaymentTemplate } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PercentTotalChip, percentTotal } from "@/components/common/PercentTotalChip";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { BILLING_MODEL_LABEL } from "@/lib/options";
import { StageEditor } from "../components/StageEditor";
import { templateSchema } from "../schemas";

const FORM_ID = "template-form";
type Values = z.input<typeof templateSchema>;

const blank: Values = {
  name: "",
  billingModel: "STAGE_SCHEDULE",
  isDefault: false,
  stages: [
    { label: "Advance", percent: 20, isRetention: false },
    { label: "Grey structure", percent: 50, isRetention: false },
    { label: "Finishing", percent: 25, isRetention: false },
    { label: "Retention", percent: 5, isRetention: true },
  ],
};

const toValues = (t: PaymentTemplate): Values => ({
  name: t.name,
  billingModel: t.billingModel,
  isDefault: t.isDefault,
  stages: t.stages.map((s) => ({ label: s.label, percent: s.percent, isRetention: Boolean(s.isRetention) })),
});

function TemplateSlideOver({ template, open, onOpenChange }: { template: PaymentTemplate | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [create, { isLoading: creating }] = useCreatePaymentTemplateMutation();
  const [update, { isLoading: updating }] = useUpdatePaymentTemplateMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    values: template ? toValues(template) : blank,
  });

  const onSubmit = async (values: z.output<typeof templateSchema>) => {
    const stages = values.stages.map((s) => ({ label: s.label, percent: s.percent, ...(s.isRetention ? { isRetention: true } : {}) }));
    const options = {
      setError: form.setError,
      codeFields: { TEMPLATE_EXISTS: "name", PERCENT_TOTAL_INVALID: "stages", RETENTION_STAGE_INVALID: "stages" },
    };
    const result = template
      ? await run(
          () =>
            update({
              id: template.id,
              body: { name: values.name, billingModel: values.billingModel, stages, ...(values.isDefault && !template.isDefault ? { isDefault: true as const } : {}) },
            }).unwrap(),
          { ...options, success: `${values.name} saved` },
        )
      : await run(() => create({ name: values.name, billingModel: values.billingModel, stages, isDefault: values.isDefault }).unwrap(), {
          ...options,
          success: `${values.name} created`,
        });
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={template ? `Edit ${template.name}` : "New payment template"}
      description="Stages must add up to exactly 100%. Projects can start from a template and adjust it."
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={template ? "Save template" : "Create template"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label="Template name" required placeholder="Villa — 4 stages" />
        <SegmentedField
          name="billingModel"
          label="Billing model"
          options={[
            { value: "STAGE_SCHEDULE", label: "Stage schedule" },
            { value: "RUNNING_BILLS", label: "Running bills" },
          ]}
        />
        <FormSection title="Stages" description="Tick the retention stage (released after the defect period).">
          <StageEditor name="stages" />
        </FormSection>
        <ToggleField
          name="isDefault"
          label="Default template"
          description="New projects start with this schedule."
          disabled={Boolean(template?.isDefault)}
        />
      </Form>
    </SlideOver>
  );
}

export function PaymentTemplatesView() {
  const readOnly = useReadOnly();
  const canEdit = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const { data, isLoading, error, refetch } = useGetPaymentTemplatesQuery();
  const [remove, { isLoading: deleting }] = useDeletePaymentTemplateMutation();
  const [update] = useUpdatePaymentTemplateMutation();
  const [newOpen, setNewOpen] = useSearchFlag();
  const [editing, setEditing] = useState<PaymentTemplate | null>(null);
  const [toDelete, setToDelete] = useState<PaymentTemplate | null>(null);
  const run = useMutationToast();

  return (
    <>
      <PageHeader
        title="Payment Templates"
        description="Reusable payment schedules for contracts."
        breadcrumbs={[{ label: "Settings" }, { label: "Payment Templates" }]}
        actions={
          canEdit ? (
            <Button onClick={() => setNewOpen(true)}>
              <Plus data-icon="inline-start" />
              New template
            </Button>
          ) : null
        }
      />
      {isLoading ? (
        <CardsSkeleton count={3} height="h-64" />
      ) : error && !data ? (
        <SectionCard>
          <ErrorState error={error} onRetry={refetch} />
        </SectionCard>
      ) : !data?.length ? (
        <SectionCard>
          <EmptyState icon={FileStack} title="No templates yet" description="Create a schedule like Advance 20% · Grey 50% · Finishing 25% · Retention 5%." />
        </SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((t) => (
            <SectionCard
              key={t.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {t.name}
                  {t.isDefault ? <StatusBadge tone="info" icon={Star} label="Default" /> : null}
                </span>
              }
              description={BILLING_MODEL_LABEL[t.billingModel]}
              actions={
                canEdit ? (
                  <>
                    {!t.isDefault ? (
                      <Button variant="ghost" size="sm" onClick={() => run(() => update({ id: t.id, body: { isDefault: true } }).unwrap(), { success: `${t.name} is now the default` })}>
                        <Star data-icon="inline-start" />
                        Make default
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
                      <Pencil />
                    </Button>
                    {!t.isDefault ? (
                      <Button variant="ghost" size="icon-sm" className="text-danger" aria-label={`Delete ${t.name}`} onClick={() => setToDelete(t)}>
                        <Trash2 />
                      </Button>
                    ) : null}
                  </>
                ) : null
              }
            >
              <ol className="space-y-2">
                {t.stages.map((s, i) => (
                  <li key={`${s.label}-${i}`} className="flex items-center gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                    <span className="flex-1">{s.label}</span>
                    {s.isRetention ? <StatusBadge tone="warning" label="Retention" className="h-5 px-2 text-[11px]" /> : null}
                    <span className="w-14 text-right font-semibold tabular">{s.percent}%</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex justify-end">
                <PercentTotalChip total={percentTotal(t.stages.map((s) => s.percent))} />
              </div>
            </SectionCard>
          ))}
        </div>
      )}
      <TemplateSlideOver
        template={editing}
        open={newOpen || Boolean(editing)}
        onOpenChange={(o) => {
          if (o) return;
          setNewOpen(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "template"}?`}
        description="Projects that already used it keep their schedule."
        confirmLabel="Delete template"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          await run(() => remove(toDelete.id).unwrap(), { success: "Template deleted" });
          setToDelete(null);
        }}
      />
    </>
  );
}
