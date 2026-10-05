"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateQualityCategoryMutation,
  useDuplicateQualityCategoryMutation,
  useUpdateQualityCategoryMutation,
} from "@/api/services/masterData.api";
import type { QualityCategory } from "@/api/types";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import { categorySchema, duplicateCategorySchema, renameCategorySchema } from "../schemas";

/** "A+ Premium" → "A_PREMIUM" (≤ 10 chars) as a starting code. */
export function suggestCode(name: string): string {
  const code = name
    .toUpperCase()
    .replace(/\+/g, "_PLUS")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "C$1")
    .slice(0, 10)
    .replace(/_+$/g, "");
  return code.length >= 2 ? code : "";
}

function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: QualityCategory[];
  onCreated: (category: QualityCategory) => void;
}) {
  const [create, { isLoading }] = useCreateQualityCategoryMutation();
  const run = useMutationToast();
  const form = useForm<z.input<typeof categorySchema>, unknown, z.output<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", code: "", description: "", copyRatesFromCategoryId: "" },
  });
  const typedName = useWatch({ control: form.control, name: "name" });

  const onSubmit = async (values: z.output<typeof categorySchema>) => {
    const result = await run(
      () =>
        create({
          name: values.name,
          code: values.code,
          ...(values.description ? { description: values.description } : {}),
          ...(values.copyRatesFromCategoryId ? { copyRatesFromCategoryId: values.copyRatesFromCategoryId } : {}),
        }).unwrap(),
      {
        success: (c) => `${c.name} added${c.copiedRates ? ` with ${c.copiedRates} rates` : ""}`,
        setError: form.setError,
        codeFields: { CATEGORY_EXISTS: "code" },
      },
    );
    if (result) {
      form.reset();
      onOpenChange(false);
      onCreated(result);
    }
  };

  return (
    <DialogShell open={open} onOpenChange={onOpenChange} title="Add quality category" description="E.g. a luxury range with premium brands.">
      <Form form={form} onSubmit={onSubmit}>
        <TextField name="name" label="Category name" required placeholder="A Luxury" />
        <TextField
          name="code"
          label="Short code"
          required
          uppercase
          placeholder={suggestCode(typedName ?? "") || "A_LUX"}
          hint="2–10 capitals, e.g. A_LUX"
        />
        <TextareaField name="description" label="Description" rows={2} />
        <SelectField
          name="copyRatesFromCategoryId"
          label="Copy rates from"
          options={categories.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Start empty"
        />
        <FormActions submitLabel="Add category" loading={isLoading} onCancel={() => onOpenChange(false)} />
      </Form>
    </DialogShell>
  );
}

export function RenameCategoryDialog({ category, onClose }: { category: QualityCategory | null; onClose: () => void }) {
  const [update, { isLoading }] = useUpdateQualityCategoryMutation();
  const run = useMutationToast();
  const form = useForm<z.input<typeof renameCategorySchema>, unknown, z.output<typeof renameCategorySchema>>({
    resolver: zodResolver(renameCategorySchema),
    values: { name: category?.name ?? "", description: category?.description ?? "" },
  });
  const onSubmit = async (values: z.output<typeof renameCategorySchema>) => {
    if (!category) return;
    const ok = await run(() => update({ id: category.id, body: { name: values.name, description: values.description || null } }).unwrap(), {
      success: "Category renamed",
      setError: form.setError,
      codeFields: { CATEGORY_EXISTS: "name" },
    });
    if (ok) onClose();
  };
  return (
    <DialogShell open={Boolean(category)} onOpenChange={(o) => !o && onClose()} title="Rename category">
      <Form form={form} onSubmit={onSubmit}>
        <TextField name="name" label="Category name" required />
        <TextareaField name="description" label="Description" rows={2} />
        <FormActions submitLabel="Save" loading={isLoading} onCancel={onClose} />
      </Form>
    </DialogShell>
  );
}

export function DuplicateCategoryDialog({
  category,
  onClose,
  onCreated,
}: {
  category: QualityCategory | null;
  onClose: () => void;
  onCreated: (category: QualityCategory) => void;
}) {
  const [duplicate, { isLoading }] = useDuplicateQualityCategoryMutation();
  const run = useMutationToast();
  const form = useForm<z.input<typeof duplicateCategorySchema>, unknown, z.output<typeof duplicateCategorySchema>>({
    resolver: zodResolver(duplicateCategorySchema),
    values: { name: category ? `${category.name} (copy)` : "", code: "" },
  });
  const onSubmit = async (values: z.output<typeof duplicateCategorySchema>) => {
    if (!category) return;
    const result = await run(() => duplicate({ id: category.id, body: values }).unwrap(), {
      success: (c) => `${c.name} created with the current rates`,
      setError: form.setError,
      codeFields: { CATEGORY_EXISTS: "code" },
    });
    if (result) {
      onClose();
      onCreated(result);
    }
  };
  return (
    <DialogShell
      open={Boolean(category)}
      onOpenChange={(o) => !o && onClose()}
      title={`Duplicate ${category?.name ?? "category"}`}
      description="The new category starts with a copy of the current rates."
    >
      <Form form={form} onSubmit={onSubmit}>
        <TextField name="name" label="New category name" required />
        <TextField name="code" label="Short code" required uppercase hint="2–10 capitals, e.g. A_LUX" />
        <FormActions submitLabel="Duplicate" loading={isLoading} onCancel={onClose} />
      </Form>
    </DialogShell>
  );
}
