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
  const [bulk, { isLoading }] = useBulkPercentMutation();
  const run = useMutationToast();
  const form = useForm<z.input<typeof bulkPercentSchema>, unknown, z.output<typeof bulkPercentSchema>>({
    resolver: zodResolver(bulkPercentSchema),
    defaultValues: { percent: null, groupId: "" },
  });

  const onSubmit = async (values: z.output<typeof bulkPercentSchema>) => {
    const result = await run(
      () => bulk({ categoryId: category.id, percent: values.percent, ...(values.groupId ? { groupId: values.groupId } : {}) }).unwrap(),
      { success: (r) => `${r.changed} rate${r.changed === 1 ? "" : "s"} updated by ${values.percent > 0 ? "+" : ""}${values.percent}%`, setError: form.setError },
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
          <DialogTitle className="text-base font-semibold">Bulk update — {category.name}</DialogTitle>
          <DialogDescription>New rates are rounded to the nearest rupee. History keeps the old rates.</DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={onSubmit}>
          <NumberField name="percent" label="Change by" required unit="%" decimals={2} allowNegative hint="Use a minus sign to lower rates (−50 to +100)." />
          <SelectField name="groupId" label="Apply to" options={groups.map((g) => ({ value: g.id, label: g.name }))} placeholder="Whole category" />
          <InlineAlert tone="warning">This saves immediately. Unsaved edits in the table are not included.</InlineAlert>
          <FormActions submitLabel="Apply change" loading={isLoading} onCancel={() => onOpenChange(false)} />
        </Form>
      </DialogContent>
    </Dialog>
  );
}
