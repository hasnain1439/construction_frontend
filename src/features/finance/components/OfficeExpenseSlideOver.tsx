"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateOfficeExpenseMutation,
  useGetOfficeExpenseCategoriesQuery,
  useUpdateOfficeExpenseMutation,
} from "@/api/services/officeExpenses.api";
import type { OfficeExpense } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { PAID_VIA_VALUES, officeExpenseSchema, type OfficeExpenseValues } from "@/features/finance/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";

/** The company's office expense categories (A–Z) and the paid-via options in the current language. */
export function useOfficeExpenseOptions() {
  const te = useEnumT();
  const query = useGetOfficeExpenseCategoriesQuery();
  return {
    categories: (query.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    categoriesLoading: query.isLoading,
    methods: PAID_VIA_VALUES.map((value) => ({ value, label: te("cashFloatMethod", value) })),
  };
}

/** Add (expense = null) or change one office expense. Mount it only while open, so the form starts fresh. */
export function OfficeExpenseSlideOver({
  expense,
  onClose,
}: {
  expense: OfficeExpense | null;
  onClose: () => void;
}) {
  const t = useT();
  const options = useOfficeExpenseOptions();
  // An expense whose category was deleted later keeps it until another one is picked.
  const categories =
    expense && !options.categories.some((c) => c.value === expense.category.id)
      ? [...options.categories, { value: expense.category.id, label: expense.category.name }]
      : options.categories;
  const [create, { isLoading: creating }] = useCreateOfficeExpenseMutation();
  const [update, { isLoading: updating }] = useUpdateOfficeExpenseMutation();
  const run = useMutationToast();
  const busy = creating || updating;
  const form = useForm<OfficeExpenseValues, unknown, z.output<typeof officeExpenseSchema>>({
    resolver: zodResolver(officeExpenseSchema),
    defaultValues: expense
      ? {
          date: expense.date,
          categoryId: expense.category.id,
          amountPaisa: expense.amountPaisa,
          paidVia: expense.paidVia,
          paidTo: expense.paidTo ?? "",
          description: expense.description,
          receipt: expense.attachmentId
            ? {
                id: expense.attachmentId,
                url: null,
                fileName: t("cashSite.office.receiptAttached"),
                mimeType: "",
              }
            : null,
        }
      : {
          date: todayPK(),
          categoryId: null,
          amountPaisa: null,
          paidVia: "CASH",
          paidTo: "",
          description: "",
          receipt: null,
        },
  });

  const onSubmit = async (v: z.output<typeof officeExpenseSchema>) => {
    const paidTo = v.paidTo.trim();
    const feedback = {
      setError: form.setError,
      codeFields: {
        FUTURE_DATE: "date",
        INVALID_CATEGORY: "categoryId",
        INVALID_ATTACHMENT: "receipt",
        ATTACHMENT_NOT_FOUND: "receipt",
      },
    };
    const ok = expense
      ? await run(
          () =>
            update({
              id: expense.id,
              body: {
                date: v.date,
                ...(v.categoryId !== expense.category.id ? { categoryId: v.categoryId } : {}),
                amountPaisa: v.amountPaisa,
                paidVia: v.paidVia,
                paidTo: paidTo || null,
                description: v.description,
                attachmentId: v.receipt?.id ?? null,
              },
            }).unwrap(),
          { ...feedback, success: t("cashSite.office.updated") },
        )
      : await run(
          () =>
            create({
              date: v.date,
              categoryId: v.categoryId,
              amountPaisa: v.amountPaisa,
              paidVia: v.paidVia,
              description: v.description,
              ...(paidTo ? { paidTo } : {}),
              ...(v.receipt ? { attachmentId: v.receipt.id } : {}),
            }).unwrap(),
          { ...feedback, success: t("cashSite.office.saved") },
        );
    if (ok) onClose();
  };

  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      title={expense ? t("cashSite.office.editTitle") : t("cashSite.office.add")}
      description={t("cashSite.office.formDesc")}
      busy={busy}
      footer={
        <FormActions
          formId="office-expense-form"
          submitLabel={expense ? t("common.saveChanges") : t("cashSite.office.save")}
          loading={busy}
          onCancel={onClose}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="office-expense-form">
        <FieldGrid>
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
          <SelectField
            name="categoryId"
            label={t("field.category")}
            required
            options={categories}
            disabled={options.categoriesLoading}
            placeholder={t("cashSite.office.chooseCategory")}
          />
        </FieldGrid>
        <FieldGrid>
          <MoneyField name="amountPaisa" label={t("field.amount")} required />
          <SelectField
            name="paidVia"
            label={t("cashSite.office.paidVia")}
            required
            options={options.methods}
          />
        </FieldGrid>
        <TextField
          name="description"
          label={t("cashSite.office.whatFor")}
          required
          placeholder={t("cashSite.office.whatForPlaceholder")}
        />
        <TextField
          name="paidTo"
          label={t("cashSite.office.paidTo")}
          placeholder={t("cashSite.office.paidToPlaceholder")}
        />
        <AttachmentField name="receipt" label={t("cashSite.office.receipt")} kind="RECEIPT" />
      </Form>
    </SlideOver>
  );
}
