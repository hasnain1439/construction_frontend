"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useOverrideEstimateLineMutation } from "@/api/services/estimates.api";
import type { BoqLine, LineOverrideBody } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { TextareaField } from "@/components/forms/TextareaField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { msg } from "@/i18n/message";
import { useT } from "@/i18n/useT";
import { boqUnit, fmt, lineText } from "./labels";

const FORM_ID = "boq-line-override";

export const overrideSchema = z
  .object({
    quantity: z.number().min(0).nullable(),
    ratePaisa: z
      .string()
      .nullable()
      .refine((v) => v === null || v === "" || /^\d+$/.test(v), msg("validation.validAmount")),
    note: z.string().trim().max(300),
  })
  .superRefine((v, ctx) => {
    const setting = v.quantity !== null || Boolean(v.ratePaisa);
    if (setting && !v.note) ctx.addIssue({ code: "custom", path: ["note"], message: msg("estimates.override.noteRequired") });
  });
type Values = z.input<typeof overrideSchema>;

/**
 * Adjust one DRAFT line: quantity and (with fields.rates, contractor lines) rate, with a
 * reason. Empty = use the worked-out value; "Remove adjustment" clears both.
 */
export function LineOverrideSlideOver({
  estimateId,
  line,
  money,
  onClose,
}: {
  estimateId: string;
  line: BoqLine | null;
  money: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [save, { isLoading }] = useOverrideEstimateLineMutation();
  const run = useMutationToast();
  const rateEditable = money && line?.suppliedBy === "CONTRACTOR";
  const form = useForm<Values>({
    resolver: zodResolver(overrideSchema),
    values: {
      quantity: line?.override?.quantity ?? null,
      ratePaisa: line?.override?.ratePaisa ?? null,
      note: line?.override?.note ?? "",
    },
  });
  const send = async (body: LineOverrideBody, success: string) => {
    if (!line) return;
    const r = await run(() => save({ id: estimateId, lineId: line.id, body }).unwrap(), {
      success,
      setError: form.setError,
      codeFields: { NOTE_REQUIRED: "note", OWNER_SUPPLIED_NO_RATE: "ratePaisa" },
    });
    if (r) onClose();
  };
  const onSubmit = (v: Values) => {
    const ratePaisa = v.ratePaisa ? v.ratePaisa : null;
    const clearing = v.quantity === null && ratePaisa === null;
    const body: LineOverrideBody = { quantity: v.quantity, ...(rateEditable ? { ratePaisa } : {}), ...(clearing ? {} : { note: v.note.trim() }) };
    return send(body, t(clearing ? "estimates.override.cleared" : "estimates.override.saved"));
  };
  return (
    <SlideOver
      open={Boolean(line)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={line ? t("estimates.boq.adjustFor", { item: lineText(t, line) }) : t("estimates.override.title")}
      description={t("estimates.override.description")}
      busy={isLoading}
      footer={
        <FormActions
          formId={FORM_ID}
          submitLabel={t("estimates.override.save")}
          loading={isLoading}
          onCancel={onClose}
          align="between"
          extra={
            line?.override ? (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => void send({ quantity: null, ...(rateEditable ? { ratePaisa: null } : {}) }, t("estimates.override.cleared"))}
              >
                {t("estimates.override.clear")}
              </Button>
            ) : undefined
          }
        />
      }
    >
      {line ? (
        <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
          <p className="text-sm text-muted-foreground tabular">
            <bdi>{t("estimates.override.calculated", { qty: fmt(line.quantityWithWastage), unit: boqUnit(t, line.unit) })}</bdi>
          </p>
          <NumberField name="quantity" label={t("estimates.override.quantity")} unit={boqUnit(t, line.unit)} hint={t("estimates.override.quantityHint")} decimals={4} />
          {rateEditable ? (
            <MoneyField name="ratePaisa" label={t("estimates.override.rate")} suffix={`/ ${boqUnit(t, line.rateUnit ?? line.unit)}`} hint={t("estimates.override.rateHint")} />
          ) : null}
          <TextareaField name="note" label={t("estimates.override.note")} rows={2} />
        </Form>
      ) : null}
    </SlideOver>
  );
}
