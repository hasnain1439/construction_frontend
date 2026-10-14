"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useBulkPercentMutation } from "@/api/services/masterData.api";
import type { MaterialGroup, QualityCategory } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { SelectField } from "@/components/forms/SelectField";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { bulkPercentSchema } from "../schemas";

/** Raise or lower every rate in a category (or one group) by a percentage. */
export function BulkPercentDialog({
  open,
  onOpenChange,
  category,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: QualityCategory;
  groups: MaterialGroup[];
}) {
  const t = useT();
  const [bulk, { isLoading }] = useBulkPercentMutation();
  const run = useMutationToast();
  const form = useForm<z.input<typeof bulkPercentSchema>, unknown, z.output<typeof bulkPercentSchema>>({
    resolver: zodResolver(bulkPercentSchema),
    defaultValues: { percent: null, groupId: "" },
  });

  const onSubmit = async (values: z.output<typeof bulkPercentSchema>) => {
    const result = await run(
      () => bulk({ categoryId: category.id, percent: values.percent, ...(values.groupId ? { groupId: values.groupId } : {}) }).unwrap(),
      { success: (r) => {
          const percent = `${values.percent > 0 ? "+" : ""}${values.percent}`;
          return r.changed === 1 ? t("masterData.bulk.oneUpdated", { percent }) : t("masterData.bulk.nUpdated", { n: r.changed, percent });
        },
         setError: form.setError },
    );
    if (result) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t("masterData.bulk.title", { name: category.name })}</DialogTitle>
          <DialogDescription>{t("masterData.bulk.description")}</DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={onSubmit}>
          <NumberField name="percent" label={t("masterData.bulk.changeBy")} required unit="%" decimals={2} allowNegative hint={t("masterData.bulk.changeHint")} />
          <SelectField name="groupId" label={t("masterData.bulk.applyTo")} options={groups.map((g) => ({ value: g.id, label: g.name }))} placeholder={t("masterData.bulk.wholeCategory")} />
          <InlineAlert tone="warning">{t("masterData.bulk.warning")}</InlineAlert>
          <FormActions submitLabel={t("masterData.bulk.submit")} loading={isLoading} onCancel={() => onOpenChange(false)} />
        </Form>
      </DialogContent>
    </Dialog>
  );
}
