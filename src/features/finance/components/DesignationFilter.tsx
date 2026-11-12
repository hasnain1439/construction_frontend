"use client";

import { useGetStaffDesignationsQuery } from "@/api/services/staff.api";
import type { Column } from "@/components/common/DataTable";
import { FilterSelect } from "@/components/common/FilterBar";
import { useT } from "@/i18n/useT";

/** "All designations" or one of the company's designations (Office Staff → Designations). */
export function DesignationFilter({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const t = useT();
  const list = useGetStaffDesignationsQuery();
  return (
    <FilterSelect
      label={t("cashSite.staff.designation")}
      value={value}
      onChange={onChange}
      options={(list.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
      allLabel={t("cashSite.staff.allDesignations")}
    />
  );
}

/** A "Designation" table column ("—" when the person has none). */
export function useDesignationColumn<T>(nameOf: (row: T) => string | null | undefined): Column<T> {
  const t = useT();
  return {
    id: "designation",
    header: t("cashSite.staff.designation"),
    cell: (row) => nameOf(row) ?? <span className="text-muted-foreground">—</span>,
    sortValue: (row) => nameOf(row) ?? "",
  };
}
