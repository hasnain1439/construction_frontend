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
import { HOLIDAY_TYPE_LABEL } from "@/lib/options";
import { holidaySchema } from "../schemas";

const FORM_ID = "holiday-form";

function AddHolidaySlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
        success: (h) => `${h.name} added`,
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
      title="Add company holiday"
      description="Your own holidays (e.g. a site closed for a wedding). National holidays are added by the platform."
      busy={isLoading}
      footer={<FormActions formId={FORM_ID} submitLabel="Add holiday" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label="Holiday name" required placeholder="Site closed — Basant" />
        <FieldGrid>
          <DateField name="startDate" label="Start date" required min={todayPK()} />
          <DateField name="endDate" label="End date" hint="Leave empty for one day." min={todayPK()} />
        </FieldGrid>
        <SegmentedField
          name="type"
          label="Type"
          options={[
            { value: "NON_WORKING", label: "Non-working" },
            { value: "PARTIAL", label: "Partial day" },
          ]}
        />
      </Form>
    </SlideOver>
  );
}

/** Platform + company holidays merged for a year; company ones can be removed. */
export function HolidaysPanel() {
  const readOnly = useReadOnly();
  const thisYear = Number(todayPK().slice(0, 4));
  const [year, setYear] = useState(String(thisYear));
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Holiday | null>(null);
  const { data, isLoading, error, refetch } = useGetHolidaysQuery({ year: Number(year) });
  const [remove, { isLoading: deleting }] = useDeleteHolidayMutation();
  const run = useMutationToast();

  const columns: Column<Holiday>[] = [
    { id: "name", header: "Holiday", cell: (h) => <span className="font-medium">{h.name}</span>, sortValue: (h) => h.name },
    {
      id: "dates",
      header: "Dates",
      cell: (h) => (h.startDate === h.endDate ? formatDate(h.startDate) : `${formatDate(h.startDate)} – ${formatDate(h.endDate)}`),
      sortValue: (h) => h.startDate,
    },
    { id: "type", header: "Type", cell: (h) => HOLIDAY_TYPE_LABEL[h.type] ?? h.type },
    {
      id: "source",
      header: "Source",
      cell: (h) =>
        h.source === "platform" ? <StatusBadge tone="neutral" label="National" /> : <StatusBadge tone="info" label="Company" />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (h) =>
        h.editable && !readOnly ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${h.name}`} onClick={() => setToDelete(h)}>
            <Trash2 />
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <FilterBar
        trailing={
          !readOnly ? (
            <Button onClick={() => setAdding(true)}>
              <CalendarPlus data-icon="inline-start" />
              Add holiday
            </Button>
          ) : null
        }
      >
        <FilterSelect
          label="Year"
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
          empty={{ title: `No holidays in ${year}`, description: "Add your own company holidays with the button above." }}
        />
      </SectionCard>
      <AddHolidaySlideOver open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "holiday"}?`}
        description="It will no longer be skipped in schedules."
        confirmLabel="Delete holiday"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          const ok = await run(() => remove(toDelete.id).unwrap(), { success: "Holiday deleted" });
          if (ok) setToDelete(null);
        }}
      />
    </>
  );
}
