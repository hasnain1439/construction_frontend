"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Percent } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useGetProjectTaxQuery, useUpdateProjectTaxMutation } from "@/api/services/tax.api";
import type { ProjectTax, TaxAuthority } from "@/api/types";
import { useCan } from "@/components/common/PermissionGate";
import { SlideOver } from "@/components/common/SlideOver";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { SelectField } from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { projectTaxSchema, type ProjectTaxValues } from "../schemas";

const MODES = ["INHERIT", "ON", "OFF"] as const;
const AUTHORITIES: TaxAuthority[] = ["PRA", "SRB", "KPRA", "ICT"];

/** One line: "PRA Sales Tax 16% on new invoices · From the company tax settings" / "No tax on this project's invoices". */
export function projectTaxText(t: ReturnType<typeof useT>, tax: ProjectTax): { main: string; source: string | null } {
  if (!tax.effective.applies) return { main: t("tax.project.off"), source: null };
  return {
    main: t("tax.project.on", { label: tax.effective.label ?? tax.effective.authority ?? "", rate: tax.effective.ratePercent }),
    source: t(tax.effective.source === "PROJECT" ? "tax.project.fromProject" : "tax.project.fromCompany"),
  };
}

function ProjectTaxSlideOver({ tax, onClose }: { tax: ProjectTax; onClose: () => void }) {
  const t = useT();
  const te = useEnumT();
  const [update, { isLoading }] = useUpdateProjectTaxMutation();
  const run = useMutationToast();
  const form = useForm<ProjectTaxValues, unknown, z.output<typeof projectTaxSchema>>({
    resolver: zodResolver(projectTaxSchema),
    defaultValues: { mode: tax.mode, authority: tax.authority, ratePercent: tax.ratePercent },
  });
  const mode = useWatch({ control: form.control, name: "mode" });
  const onSubmit = async (v: z.output<typeof projectTaxSchema>) => {
    const ok = await run(() => update({ projectId: tax.projectId, body: { mode: v.mode, authority: v.authority, ratePercent: v.ratePercent } }).unwrap(), {
      success: t("tax.project.saved"),
      setError: form.setError,
      codeFields: { TAX_SETTINGS_INCOMPLETE: "authority" },
    });
    if (ok) onClose();
  };
  return (
    <SlideOver
      open
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={t("tax.project.dialogTitle")}
      description={t("tax.project.dialogDesc")}
      busy={isLoading}
      footer={<FormActions formId="project-tax-form" submitLabel={t("common.save")} loading={isLoading} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="project-tax-form">
        <SelectField name="mode" label={t("tax.project.mode")} required options={MODES.map((m) => ({ value: m, label: te("projectTaxMode", m) }))} />
        {mode !== "OFF" ? (
          <>
            <SelectField
              name="authority"
              label={t("tax.project.authority")}
              noneLabel={t("tax.project.sameAsCompany")}
              placeholder={t("tax.project.sameAsCompany")}
              options={AUTHORITIES.map((a) => ({ value: a, label: te("taxAuthority", a) }))}
            />
            <NumberField name="ratePercent" label={t("tax.project.rate")} hint={t("tax.project.rateHint")} unit="%" decimals={2} placeholder={String(tax.company.ratePercent)} />
          </>
        ) : null}
      </Form>
    </SlideOver>
  );
}

/** Billing → Invoices: the tax new invoices of this project get, and (tax.settings.manage) its override. */
export function ProjectTaxCard({ projectId }: { projectId: string }) {
  const t = useT();
  const canView = useCan("billing.invoice.view");
  const canManage = useCan("tax.settings.manage");
  const readOnly = useReadOnly();
  const q = useGetProjectTaxQuery(projectId, { skip: !canView });
  const [editing, setEditing] = useState(false);
  const tax = q.data;
  // Nothing to say when tax is off everywhere and the user can't change it.
  if (!tax || (!tax.effective.applies && !tax.company.enabled && tax.mode === "INHERIT" && !canManage)) return null;
  const text = projectTaxText(t, tax);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm" data-testid="project-tax">
      <div className="flex items-center gap-2">
        <Percent className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{t("tax.project.title")}:</span>
        <span>{text.main}</span>
        {text.source ? <span className="text-muted-foreground">· {text.source}</span> : null}
      </div>
      {canManage && !readOnly ? (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil data-icon="inline-start" />
          {t("tax.project.change")}
        </Button>
      ) : null}
      {editing ? <ProjectTaxSlideOver tax={tax} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
