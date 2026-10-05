"use client";

import type { ReactNode } from "react";
import { FormProvider, type FieldValues, type SubmitHandler, type UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/cn";

/**
 * `<Form form={form} onSubmit={save}>` — FormProvider + <form>. Field components read
 * the form from context, so pages only pass `name`.
 */
export function Form<TFieldValues extends FieldValues, TTransformed = TFieldValues>({
  form,
  onSubmit,
  children,
  id,
  className,
}: {
  form: UseFormReturn<TFieldValues, unknown, TTransformed>;
  onSubmit: SubmitHandler<TTransformed>;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <FormProvider {...form}>
      <form id={id} noValidate onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-5", className)}>
        {children}
      </form>
    </FormProvider>
  );
}

/** Small heading that groups fields inside a long form. */
export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      <legend className="mb-1 space-y-0.5">
        <span className="block text-sm font-semibold">{title}</span>
        {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

/** 1–3 column responsive grid for fields. */
export function FieldGrid({ children, columns = 2, className }: { children: ReactNode; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
