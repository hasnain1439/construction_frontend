"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  useCreatePlatformHolidayMutation,
  useDeletePlatformHolidayMutation,
  useGetPlatformHolidaysQuery,
  useUpdatePlatformHolidayMutation,
} from "@/api/services/admin/holidays.api";
import type { PlatformHoliday } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate, todayPK } from "@/lib/dates";
import { HOLIDAY_TYPE_LABEL, REGION_LABEL } from "@/lib/options";
import { platformHolidaySchema } from "../schemas";

const FORM_ID = "platform-holiday-form";
type Values = z.input<typeof platformHolidaySchema>;

function HolidaySlideOver({ holiday, open, onOpenChange }: { holiday: PlatformHoliday | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [create, { isLoading: creating }] = useCreatePlatformHolidayMutation();
  const [update, { isLoading: updating }] = useUpdatePlatformHolidayMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof platformHolidaySchema>>({
    resolver: zodResolver(platformHolidaySchema),
    values: {
      name: holiday?.name ?? "",
      startDate: holiday?.startDate ?? "",
      endDate: holiday?.endDate ?? "",
      type: holiday?.type ?? "NON_WORKING",
      region: holiday?.region ?? "ALL",
    },
  });
  const onSubmit = async (v: z.output<typeof platformHolidaySchema>) => {
    const body = { name: v.name, startDate: v.startDate, endDate: v.endDate || v.startDate, type: v.type, region: v.region === "ALL" ? null : v.region };
    const result = holiday
      ? await run(() => update({ id: holiday.id, body }).unwrap(), { success: `${v.name} saved`, setError: form.setError })
      : await run(() => create(body).unwrap(), { success: `${v.name} added to every company calendar`, setError: form.setError });
    if (result) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={holiday ? `Edit ${holiday.name}` : "Add holiday"}
      description="Platform holidays appear in every company's calendar (or one region)."
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={holiday ? "Save holiday" : "Add holiday"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label="Name" required placeholder="Eid-ul-Fitr" />
        <FieldGrid>
          <DateField name="startDate" label="Start date" required />
          <DateField name="endDate" label="End date" hint="Leave empty for one day." />
        </FieldGrid>
        <SegmentedField
          name="type"
          label="Type"
          options={[
            { value: "NON_WORKING", label: "Non-working" },
            { value: "PARTIAL", label: "Partial day" },
          ]}
        />
        <SelectField
          name="region"
          label="Applies to"
          options={[
            { value: "ALL", label: "Nationwide" },
            { value: "PUNJAB_KP", label: "Punjab / KP" },
            { value: "KARACHI_SINDH", label: "Karachi / Sindh" },
          ]}
        />
      </Form>
    </SlideOver>
  );
}

export function AdminHolidaysView() {
  const thisYear = Number(todayPK().slice(0, 4));
  const [year, setYear] = useState(String(thisYear));
  const { data, isLoading, error, refetch } = useGetPlatformHolidaysQuery({ year: Number(year) });
  const [remove, { isLoading: deleting }] = useDeletePlatformHolidayMutation();
  const [editing, setEditing] = useState<PlatformHoliday | null>(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<PlatformHoliday | null>(null);
  const run = useMutationToast();

  const columns: Column<PlatformHoliday>[] = [
    { id: "name", header: "Holiday", cell: (h) => <span className="font-medium">{h.name}</span>, sortValue: (h) => h.name },
    {
      id: "dates",
      header: "Dates",
      cell: (h) => (h.startDate === h.endDate ? formatDate(h.startDate) : `${formatDate(h.startDate)} – ${formatDate(h.endDate)}`),
      sortValue: (h) => h.startDate,
    },
    { id: "type", header: "Type", cell: (h) => HOLIDAY_TYPE_LABEL[h.type] },
    { id: "region", header: "Region", cell: (h) => (h.region ? <StatusBadge tone="info" label={REGION_LABEL[h.region]} /> : <StatusBadge tone="neutral" label="Nationwide" />) },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (h) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${h.name}`} onClick={() => setEditing(h)}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-danger" aria-label={`Delete ${h.name}`} onClick={() => setToDelete(h)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Holiday Calendar"
        description="Lunar holidays (Eids, Ashura) must be added each year."
        breadcrumbs={[{ label: "Holiday Calendar" }]}
        actions={
          <Button onClick={() => setAdding(true)}>
            <CalendarPlus data-icon="inline-start" />
            Add holiday
          </Button>
        }
      />
      <FilterBar>
        <FilterSelect
          label="Year"
          value={year}
          onChange={(v) => setYear(v || String(thisYear))}
          allLabel={String(thisYear)}
          options={[thisYear - 1, thisYear + 1, thisYear + 2].map((y) => ({ value: String(y), label: String(y) }))}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable rows={data} columns={columns} getRowId={(h) => h.id} loading={isLoading} error={error} onRetry={refetch} clientPageSize={25} empty={{ title: `No holidays in ${year}` }} />
      </SectionCard>
      <HolidaySlideOver
        holiday={editing}
        open={adding || Boolean(editing)}
        onOpenChange={(o) => {
          if (o) return;
          setAdding(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "holiday"}?`}
        description="It disappears from every company calendar."
        confirmLabel="Delete holiday"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          await run(() => remove(toDelete.id).unwrap(), { success: "Holiday deleted" });
          setToDelete(null);
        }}
      />
    </>
  );
}
