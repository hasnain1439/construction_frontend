"use client";

import { HardHat, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import {
  useGetSubcontractorsQuery,
  useGetWorkersQuery,
  useSetSubcontractorActiveMutation,
  useSetWorkerActiveMutation,
} from "@/api/services/masterData.api";
import type { Subcontractor, SubcontractorsQuery, Worker, WorkersQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { HiddenForRole } from "@/components/common/HiddenForRole";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { formatPhone } from "@/lib/phone";
import { toOptions, TRADE_LABEL, WORKER_TYPE_LABEL } from "@/lib/options";
import { ActiveToggle } from "../components/ActiveToggle";
import { SubcontractorSlideOver, WorkerSlideOver } from "../components/WorkforceSlideOvers";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function WorkersView() {
  const readOnly = useReadOnly();
  const canAdd = useCan({ roles: ["THEKEDAR", "PM", "MUNSHI"] }) && !readOnly;
  const canEdit = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const canSeeRates = useCan({ permission: "rates.view" });
  const list = useListState({ type: "", isActive: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetWorkersQuery(list.query as WorkersQuery);
  const [setActive, { isLoading: toggling }] = useSetWorkerActiveMutation();
  const [addOpen, setAddOpen] = useSearchFlag();
  const [editing, setEditing] = useState<Worker | null>(null);
  const run = useMutationToast();

  const columns: Column<Worker>[] = [
    { id: "name", header: "Name", cell: (w) => <span className="font-medium">{w.name}</span>, sortValue: (w) => w.name },
    { id: "type", header: "Type", cell: (w) => WORKER_TYPE_LABEL[w.type] ?? w.type, sortValue: (w) => w.type },
    { id: "phone", header: "Phone", cell: (w) => <span className="tabular">{formatPhone(w.phone)}</span> },
    {
      id: "rate",
      header: "Daily rate",
      align: "right",
      cell: (w) => (canSeeRates ? <MoneyText paisa={w.dailyRatePaisa} /> : <HiddenForRole compact />),
      sortValue: (w) => Number(w.dailyRatePaisa),
    },
    { id: "status", header: "Status", cell: (w) => <StatusBadge domain="active" value={w.isActive} /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      hidden: !canEdit,
      cell: (w) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(w)}>
            Edit
          </Button>
          <ActiveToggle
            name={w.name}
            isActive={w.isActive}
            loading={toggling}
            consequence="They can't be marked present on new hazri. Past records are kept."
            onToggle={(active) => run(() => setActive({ id: w.id, active }).unwrap(), { success: `${w.name} ${active ? "activated" : "deactivated"}` })}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Workers Directory"
        description="Daily-wage mistris and mazdoors."
        breadcrumbs={[{ label: "Workforce" }, { label: "Workers Directory" }]}
        actions={
          canAdd ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add worker
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or phone…" />
        <FilterSelect label="Type" value={list.filters.type} onChange={(v) => list.setFilter("type", v)} options={toOptions(WORKER_TYPE_LABEL)} />
        <FilterSelect label="Status" value={list.filters.isActive} onChange={(v) => list.setFilter("isActive", v)} options={STATUS_OPTIONS} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(w) => w.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: "No workers found", description: "Add your mistris and mazdoors to mark hazri.", icon: HardHat }}
          pagination={
            data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined
          }
        />
      </SectionCard>
      <WorkerSlideOver
        open={addOpen || Boolean(editing)}
        worker={editing}
        onOpenChange={(o) => {
          if (o) return;
          setAddOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}

export function SubcontractorsView() {
  const readOnly = useReadOnly();
  const canEdit = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const list = useListState({ trade: "", isActive: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetSubcontractorsQuery(list.query as SubcontractorsQuery);
  const [setActive, { isLoading: toggling }] = useSetSubcontractorActiveMutation();
  const [addOpen, setAddOpen] = useSearchFlag();
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const run = useMutationToast();

  const columns: Column<Subcontractor>[] = [
    { id: "name", header: "Name", cell: (s) => <span className="font-medium">{s.name}</span>, sortValue: (s) => s.name },
    { id: "trade", header: "Trade", cell: (s) => TRADE_LABEL[s.trade] ?? s.trade, sortValue: (s) => s.trade },
    { id: "phone", header: "Phone", cell: (s) => <span className="tabular">{formatPhone(s.phone)}</span> },
    { id: "notes", header: "Notes", cell: (s) => <span className="line-clamp-1 text-muted-foreground">{s.notes ?? "—"}</span> },
    { id: "status", header: "Status", cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      hidden: !canEdit,
      cell: (s) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
            Edit
          </Button>
          <ActiveToggle
            name={s.name}
            isActive={s.isActive}
            loading={toggling}
            consequence="They won't be offered for new work measurements. Past accounts are kept."
            onToggle={(active) => run(() => setActive({ id: s.id, active }).unwrap(), { success: `${s.name} ${active ? "activated" : "deactivated"}` })}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sub-contractors"
        description="Teams paid by measured work — shuttering, steel fixing, plaster …"
        breadcrumbs={[{ label: "Workforce" }, { label: "Sub-contractors" }]}
        actions={
          canEdit ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add sub-contractor
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name…" />
        <FilterSelect label="Trade" value={list.filters.trade} onChange={(v) => list.setFilter("trade", v)} options={toOptions(TRADE_LABEL)} />
        <FilterSelect label="Status" value={list.filters.isActive} onChange={(v) => list.setFilter("isActive", v)} options={STATUS_OPTIONS} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(s) => s.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: "No sub-contractors found", description: "Add the teams you give piece-rate work to.", icon: UsersRound }}
          pagination={
            data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined
          }
        />
      </SectionCard>
      <SubcontractorSlideOver
        open={addOpen || Boolean(editing)}
        subcontractor={editing}
        onOpenChange={(o) => {
          if (o) return;
          setAddOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
