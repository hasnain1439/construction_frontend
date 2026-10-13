"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateSubcontractorMutation,
  useCreateWorkerMutation,
  useUpdateSubcontractorMutation,
  useUpdateWorkerMutation,
} from "@/api/services/masterData.api";
import type { Subcontractor, Worker } from "@/api/types";
import { usePermissions } from "@/components/common/PermissionGate";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { PhoneField } from "@/components/forms/PhoneInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatPKR } from "@/lib/money";
import { useT } from "@/i18n/useT";
import { toOptions, TRADE_LABEL } from "@/lib/options";
import { formatPhone } from "@/lib/phone";
import { OTHER_WORKER_TYPE } from "@/lib/workerTypes";
import { useWorkerTypeOptions } from "@/hooks/useWorkerTypes";
import { subcontractorSchema, workerSchema } from "../schemas";

type WorkerValues = z.input<typeof workerSchema>;

function DailyRateField({ canSeeRates, standardRate }: { canSeeRates: boolean; standardRate: string | null }) {
  const t = useT();
  const type = useWatch({ name: "type" }) as WorkerValues["type"];
  return (
    <MoneyField
      name="dailyRatePaisa"
      label={t("workerTypes.dailyRate")}
      required={type === OTHER_WORKER_TYPE}
      hint={
        type === OTHER_WORKER_TYPE
          ? t("workerTypes.rateHintOther")
          : canSeeRates && standardRate
            ? t("workerTypes.rateHintStandard", { amount: formatPKR(standardRate) })
            : t("workerTypes.rateHintDefault")
      }
    />
  );
}

export function WorkerSlideOver({ open, worker, onOpenChange }: { open: boolean; worker: Worker | null; onOpenChange: (open: boolean) => void }) {
  const FORM_ID = "worker-form";
  const t = useT();
  const canSeeRates = usePermissions().canSee("rates");
  const [create, { isLoading: creating }] = useCreateWorkerMutation();
  const [update, { isLoading: updating }] = useUpdateWorkerMutation();
  // Active types, plus the worker's own type even if it was deactivated since.
  const { options: typeOptions, byKey } = useWorkerTypeOptions({ current: worker?.type ?? null });
  const run = useMutationToast();
  const form = useForm<WorkerValues, unknown, z.output<typeof workerSchema>>({
    resolver: zodResolver(workerSchema),
    values: {
      name: worker?.name ?? "",
      type: worker?.type ?? "",
      phone: worker?.phone ? formatPhone(worker.phone) : "",
      dailyRatePaisa: worker?.dailyRatePaisa ?? null,
      notes: worker?.notes ?? "",
    },
  });
  const type = useWatch({ control: form.control, name: "type" });

  /** Picking a type fills in its standard daily rate unless the rate was typed in by hand. */
  const onTypeChange = (key: string | null) => {
    const typedIn = form.getFieldState("dailyRatePaisa").isDirty && Boolean(form.getValues("dailyRatePaisa"));
    if (typedIn) return;
    if (key === OTHER_WORKER_TYPE) {
      form.setValue("dailyRatePaisa", worker && worker.type === OTHER_WORKER_TYPE ? worker.dailyRatePaisa : null);
      return;
    }
    const standard = key ? byKey.get(key) : undefined;
    if (standard && canSeeRates) form.setValue("dailyRatePaisa", standard.ratePaisa);
  };

  const onSubmit = async (v: z.output<typeof workerSchema>) => {
    const options = {
      setError: form.setError,
      codeFields: { WORKER_PHONE_TAKEN: "phone", DAILY_RATE_REQUIRED: "dailyRatePaisa", INVALID_WORKER_TYPE: "type" },
    };
    const result = worker
      ? await run(
          () =>
            update({
              id: worker.id,
              body: {
                name: v.name,
                type: v.type,
                phone: v.phone ?? null,
                ...(v.dailyRatePaisa ? { dailyRatePaisa: v.dailyRatePaisa } : {}),
                notes: v.notes ?? null,
              },
            }).unwrap(),
          { ...options, success: `${v.name} saved` },
        )
      : await run(
          () =>
            create({
              name: v.name,
              type: v.type,
              ...(v.phone ? { phone: v.phone } : {}),
              ...(v.dailyRatePaisa ? { dailyRatePaisa: v.dailyRatePaisa } : {}),
              ...(v.notes ? { notes: v.notes } : {}),
            }).unwrap(),
          { ...options, success: `${v.name} added` },
        );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={worker ? `Edit ${worker.name}` : "Add worker"}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={worker ? "Save worker" : "Add worker"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label="Name" required placeholder="Ustad Akram" />
        <FieldGrid>
          <SelectField
            name="type"
            label={t("common.type")}
            required
            options={typeOptions}
            placeholder={t("workerTypes.chooseType")}
            onValueChange={onTypeChange}
          />
          <PhoneField name="phone" label="Phone" />
        </FieldGrid>
        <DailyRateField canSeeRates={canSeeRates} standardRate={byKey.get(type)?.ratePaisa ?? null} />
        <TextareaField name="notes" label="Notes" rows={2} />
      </Form>
    </SlideOver>
  );
}

type SubValues = z.input<typeof subcontractorSchema>;

export function SubcontractorSlideOver({
  open,
  subcontractor,
  onOpenChange,
}: {
  open: boolean;
  subcontractor: Subcontractor | null;
  onOpenChange: (open: boolean) => void;
}) {
  const FORM_ID = "subcontractor-form";
  const [create, { isLoading: creating }] = useCreateSubcontractorMutation();
  const [update, { isLoading: updating }] = useUpdateSubcontractorMutation();
  const run = useMutationToast();
  const form = useForm<SubValues, unknown, z.output<typeof subcontractorSchema>>({
    resolver: zodResolver(subcontractorSchema),
    values: {
      name: subcontractor?.name ?? "",
      trade: subcontractor?.trade ?? "SHUTTERING",
      phone: subcontractor?.phone ? formatPhone(subcontractor.phone) : "",
      notes: subcontractor?.notes ?? "",
    },
  });

  const onSubmit = async (v: z.output<typeof subcontractorSchema>) => {
    const options = { setError: form.setError, codeFields: { SUBCONTRACTOR_EXISTS: "name" } };
    const result = subcontractor
      ? await run(
          () => update({ id: subcontractor.id, body: { name: v.name, trade: v.trade, phone: v.phone ?? null, notes: v.notes ?? null } }).unwrap(),
          { ...options, success: `${v.name} saved` },
        )
      : await run(
          () => create({ name: v.name, trade: v.trade, ...(v.phone ? { phone: v.phone } : {}), ...(v.notes ? { notes: v.notes } : {}) }).unwrap(),
          { ...options, success: `${v.name} added` },
        );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={subcontractor ? `Edit ${subcontractor.name}` : "Add sub-contractor"}
      description="A team paid by measured work (sq ft, tons, bricks …)."
      busy={creating || updating}
      footer={
        <FormActions formId={FORM_ID} submitLabel={subcontractor ? "Save sub-contractor" : "Add sub-contractor"} loading={creating || updating} onCancel={() => onOpenChange(false)} />
      }
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label="Name" required placeholder="Ustad Sharif Shuttering" />
        <FieldGrid>
          <SelectField name="trade" label="Trade" required options={toOptions(TRADE_LABEL)} />
          <PhoneField name="phone" label="Phone" allowLandline />
        </FieldGrid>
        <TextareaField name="notes" label="Notes" rows={2} />
      </Form>
    </SlideOver>
  );
}
