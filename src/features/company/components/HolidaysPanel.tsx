"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useCreateHolidayMutation, useDeleteHolidayMutation, useGetHolidaysQuery } from "@/api/services/company.api";
import type { Holiday } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatDate, todayPK } from "@/lib/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEnumT, useT } from "@/i18n/useT";
import { holidaySchema } from "../schemas";

const FORM_ID = "holiday-form";

/** Page header of Settings → Holidays (the page itself is a server component). */
export function HolidaysPageHeader() {
  const t = useT();
  return (
    <PageHeader
      title={t("teamCompany.holidays.title")}
      description={t("teamCompany.holidays.desc")}
      breadcrumbs={[{ label: t("crumb.settings") }, { label: t("teamCompany.holidays.title") }]}
    />
  );
}

function AddHolidaySlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const te = useEnumT();
  const [create, { isLoading }] = useCreateHolidayMutation();
  const run = useMutationToast();
  const form = useForm<z.input<typeof holidaySchema>, unknown, z.output<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { name: "", startDate: "", endDate: "", type: "NON_WORKING" },
  });

  const onSubmit = async (values: z.output<typeof holidaySchema>) => {
    const result = await run(
      () => create({ name: values.name, startDate: values.startDate, endDate: values.endDate || values.startDate, type: values.type }).unwrap(),
      {
        success: (h) => t("teamCompany.holidays.added", { name: h.name }),
        setError: form.setError,
        codeFields: { HOLIDAY_IN_PAST: "startDate", HOLIDAY_EXISTS: "startDate", INVALID_DATES: "endDate" },
      },
    );
    if (result) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("teamCompany.holidays.addTitle")}
      description={t("teamCompany.holidays.addDesc")}
      busy={isLoading}
      footer={<FormActions formId={FORM_ID} submitLabel={t("teamCompany.holidays.add")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label={t("teamCompany.holidays.name")} required placeholder={t("teamCompany.holidays.namePlaceholder")} />
        <FieldGrid>
          <DateField name="startDate" label={t("teamCompany.holidays.startDate")} required min={todayPK()} />
          <DateField name="endDate" label={t("teamCompany.holidays.endDate")} hint={t("teamCompany.holidays.endHint")} min={todayPK()} />
        </FieldGrid>
        <SegmentedField
          name="type"
          label={t("field.type")}
          options={(["NON_WORKING", "PARTIAL"] as const).map((value) => ({ value, label: te("holidayType", value) }))}
        />
      </Form>
    </SlideOver>
  );
}

/** Platform + company holidays merged for a year; company ones can be removed. */
export function HolidaysPanel() {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const thisYear = Number(todayPK().slice(0, 4));
  const [year, setYear] = useState(String(thisYear));
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Holiday | null>(null);
  const { data, isLoading, error, refetch } = useGetHolidaysQuery({ year: Number(year) });
  const [remove, { isLoading: deleting }] = useDeleteHolidayMutation();
  const run = useMutationToast();

  const columns: Column<Holiday>[] = [
    { id: "name", header: t("teamCompany.holidays.colHoliday"), cell: (h) => <span className="font-medium">{h.name}</span>, sortValue: (h) => h.name },
    {
      id: "dates",
      header: t("teamCompany.holidays.colDates"),
      cell: (h) => (h.startDate === h.endDate ? formatDate(h.startDate) : t("teamCompany.holidays.range", { from: formatDate(h.startDate), to: formatDate(h.endDate) })),
      sortValue: (h) => h.startDate,
    },
    { id: "type", header: t("field.type"), cell: (h) => te("holidayType", h.type) },
    {
      id: "source",
      header: t("teamCompany.holidays.colSource"),
      cell: (h) =>
        h.source === "platform" ? <StatusBadge tone="neutral" label={t("teamCompany.holidays.national")} /> : <StatusBadge tone="info" label={t("teamCompany.holidays.company")} />,
    },
    {
      ...ACTIONS_COLUMN,
      cell: (h) => (
        <RowActions
          name={h.name}
          actions={[{ label: t("common.delete"), icon: Trash2, destructive: true, hidden: !h.editable || readOnly, onSelect: () => setToDelete(h) }]}
        />
      ),
    },
  ];

  return (
    <>
      <FilterBar
        trailing={
          !readOnly ? (
            <Button onClick={() => setAdding(true)}>
              <CalendarPlus data-icon="inline-start" />
              {t("teamCompany.holidays.add")}
            </Button>
          ) : null
        }
      >
        <FilterSelect
          label={t("teamCompany.holidays.year")}
          value={year}
          onChange={(v) => setYear(v || String(thisYear))}
          options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: String(y), label: String(y) }))}
          allLabel={String(thisYear)}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(h) => h.id}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          clientPageSize={25}
          empty={{ title: t("teamCompany.holidays.empty", { year }), description: t("teamCompany.holidays.emptyDesc") }}
        />
      </SectionCard>
      <AddHolidaySlideOver open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t("teamCompany.holidays.deleteTitle", { name: toDelete?.name ?? t("teamCompany.holidays.holiday") })}
        description={t("teamCompany.holidays.deleteBody")}
        confirmLabel={t("teamCompany.holidays.deleteConfirm")}
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          const ok = await run(() => remove(toDelete.id).unwrap(), { success: t("teamCompany.holidays.deleted") });
          if (ok) setToDelete(null);
        }}
      />
    </>
  );
}
