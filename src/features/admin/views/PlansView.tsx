"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Layers, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useCreatePlanMutation, useGetAdminPlansQuery, useUpdatePlanMutation } from "@/api/services/admin/plans.api";
import type { AdminPlan } from "@/api/types";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/features/subscription/components/PlanCard";
import { useMutationToast } from "@/hooks/useMutationToast";
import { planSchema } from "../schemas";

const FORM_ID = "plan-form";
type Values = z.input<typeof planSchema>;

const toValues = (p: AdminPlan | null): Values => ({
  code: p?.code ?? "",
  name: p?.name ?? "",
  pricePaisa: p?.pricePaisa ?? null,
  unlimitedProjects: p ? p.maxActiveProjects === null : false,
  maxActiveProjects: p?.maxActiveProjects ?? 5,
  unlimitedUsers: p ? p.maxOfficeUsers === null : false,
  maxOfficeUsers: p?.maxOfficeUsers ?? 5,
  features: (p?.features ?? []).join("\n"),
  isActive: p?.isActive ?? true,
  sortOrder: p?.sortOrder ?? 0,
});

function LimitField({ flag, name, label }: { flag: "unlimitedProjects" | "unlimitedUsers"; name: string; label: string }) {
  const unlimited = useWatch({ name: flag }) as boolean;
  return (
    <div className="space-y-2">
      {unlimited ? <p className="pt-7 text-sm text-muted-foreground">{label}: unlimited</p> : <NumberField name={name} label={label} required decimals={0} />}
      <ToggleField name={flag} label={`Unlimited ${label.toLowerCase()}`} />
    </div>
  );
}

function PlanSlideOver({ plan, open, onOpenChange }: { plan: AdminPlan | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [create, { isLoading: creating }] = useCreatePlanMutation();
  const [update, { isLoading: updating }] = useUpdatePlanMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof planSchema>>({ resolver: zodResolver(planSchema), values: toValues(plan) });

  const onSubmit = async (v: z.output<typeof planSchema>) => {
    const body = {
      name: v.name,
      pricePaisa: v.pricePaisa,
      maxActiveProjects: v.unlimitedProjects ? null : v.maxActiveProjects,
      maxOfficeUsers: v.unlimitedUsers ? null : v.maxOfficeUsers,
      features: v.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      isActive: v.isActive,
      sortOrder: v.sortOrder ?? 0,
    };
    const result = plan
      ? await run(() => update({ id: plan.id, body }).unwrap(), { success: `${v.name} saved`, setError: form.setError, codeFields: { LAST_ACTIVE_PLAN: "isActive" } })
      : await run(() => create({ ...body, code: v.code }).unwrap(), { success: `${v.name} created`, setError: form.setError, codeFields: { PLAN_CODE_TAKEN: "code" } });
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? `Edit ${plan.name}` : "New plan"}
      description={plan ? "Price changes apply to future payments." : undefined}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={plan ? "Save plan" : "Create plan"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <FieldGrid>
          <TextField name="code" label="Code" required uppercase disabled={Boolean(plan)} hint={plan ? "Codes can't change." : "e.g. PROFESSIONAL"} />
          <TextField name="name" label="Name" required />
        </FieldGrid>
        <MoneyField name="pricePaisa" label="Price per month" required />
        <FieldGrid>
          <LimitField flag="unlimitedProjects" name="maxActiveProjects" label="Active projects" />
          <LimitField flag="unlimitedUsers" name="maxOfficeUsers" label="Office users" />
        </FieldGrid>
        <TextareaField name="features" label="Features" rows={5} hint="One per line, shown on the plan card." />
        <FieldGrid>
          <NumberField name="sortOrder" label="Sort order" decimals={0} />
          <ToggleField name="isActive" label="Active" description="Inactive plans can't be chosen." className="self-end" />
        </FieldGrid>
      </Form>
    </SlideOver>
  );
}

export function PlansView() {
  const { data, isLoading, error, refetch } = useGetAdminPlansQuery();
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        title="Plans"
        breadcrumbs={[{ label: "Plans" }]}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            New plan
          </Button>
        }
      />
      {isLoading ? (
        <CardsSkeleton count={4} height="h-72" />
      ) : error && !data ? (
        <SectionCard>
          <ErrorState error={error} onRetry={refetch} />
        </SectionCard>
      ) : !data?.length ? (
        <SectionCard>
          <EmptyState icon={Layers} title="No plans yet" />
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              badge={plan.isActive ? <StatusBadge tone="success" label={`${plan.companies} companies`} /> : <StatusBadge tone="neutral" label="Inactive" />}
              action={
                <Button variant="outline" className="w-full" onClick={() => setEditing(plan)}>
                  <Pencil data-icon="inline-start" />
                  Edit
                </Button>
              }
            />
          ))}
        </div>
      )}
      <PlanSlideOver
        plan={editing}
        open={creating || Boolean(editing)}
        onOpenChange={(o) => {
          if (o) return;
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}
