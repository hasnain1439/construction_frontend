"use client";

import { HardHat, Pencil, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
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
import { useCan, usePermissions } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
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
import { useT } from "@/i18n/useT";
import { toOptions, TRADE_LABEL } from "@/lib/options";
import { namesFromWorker } from "@/lib/workerTypes";
import { activeToggleAction } from "../components/ActiveToggle";
import { SubcontractorSlideOver, WorkerSlideOver } from "../components/WorkforceSlideOvers";
import { useWorkerTypeName, useWorkerTypeOptions } from "@/hooks/useWorkerTypes";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

export function WorkersView() {
  const readOnly = useReadOnly();
  const { can, canSee } = usePermissions();
  const canAdd = can("masterdata.worker.create") && !readOnly;
  const canEdit = can("masterdata.worker.edit") && !readOnly;
  const canSeeRates = canSee("rates");
  // The worker page is their labour account (days, wages, peshgi).
  const office = can("labor.account.view");
  const list = useListState({ type: "", isActive: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetWorkersQuery(list.query as WorkersQuery);
  const [setActive, { isLoading: toggling }] = useSetWorkerActiveMutation();
  const [addOpen, setAddOpen] = useSearchFlag();
  const [editing, setEditing] = useState<Worker | null>(null);
  const run = useMutationToast();
  const t = useT();
  const typeName = useWorkerTypeName();
  const { options: typeOptions } = useWorkerTypeOptions({ all: true });

  const columns: Column<Worker>[] = [
    {
      id: "name",
      header: "Name",
      cell: (w) =>
        office ? (
          <Link href={`/workforce/workers/${w.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {w.name}
          </Link>
        ) : (
          <span className="font-medium">{w.name}</span>
        ),
      sortValue: (w) => w.name,
    },
    {
      id: "type",
      header: t("common.type"),
      cell: (w) => <bdi>{typeName(w.type, namesFromWorker(w))}</bdi>,
      sortValue: (w) => typeName(w.type, namesFromWorker(w)),
    },
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
      ...ACTIONS_COLUMN,
      hidden: !canEdit,
      cell: (w) => (
        <RowActions
          name={w.name}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => setEditing(w) },
            activeToggleAction({
              name: w.name,
              isActive: w.isActive,
              loading: toggling,
              consequence: "They can't be marked present on new hazri. Past records are kept.",
              onToggle: (active) => run(() => setActive({ id: w.id, active }).unwrap(), { success: `${w.name} ${active ? "activated" : "deactivated"}` }),
            }),
          ]}
        />
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
        <FilterSelect label={t("common.type")} value={list.filters.type} onChange={(v) => list.setFilter("type", v)} options={typeOptions} />
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
  const canCreate = useCan("masterdata.subcontractor.create") && !readOnly;
  const canEdit = useCan("masterdata.subcontractor.edit") && !readOnly;
  const canOpen = useCan("labor.account.view");
  const list = useListState({ trade: "", isActive: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetSubcontractorsQuery(list.query as SubcontractorsQuery);
  const [setActive, { isLoading: toggling }] = useSetSubcontractorActiveMutation();
  const [addOpen, setAddOpen] = useSearchFlag();
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const run = useMutationToast();

  const columns: Column<Subcontractor>[] = [
    {
      id: "name",
      header: "Name",
      cell: (s) =>
        canOpen ? (
          <Link href={`/workforce/subcontractors/${s.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {s.name}
          </Link>
        ) : (
          <span className="font-medium">{s.name}</span>
        ),
      sortValue: (s) => s.name,
    },
    { id: "trade", header: "Trade", cell: (s) => TRADE_LABEL[s.trade] ?? s.trade, sortValue: (s) => s.trade },
    { id: "phone", header: "Phone", cell: (s) => <span className="tabular">{formatPhone(s.phone)}</span> },
    { id: "notes", header: "Notes", cell: (s) => <span className="line-clamp-1 text-muted-foreground">{s.notes ?? "—"}</span> },
    { id: "status", header: "Status", cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
    {
      ...ACTIONS_COLUMN,
      hidden: !canEdit,
      cell: (s) => (
        <RowActions
          name={s.name}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => setEditing(s) },
            activeToggleAction({
              name: s.name,
              isActive: s.isActive,
              loading: toggling,
              consequence: "They won't be offered for new work measurements. Past accounts are kept.",
              onToggle: (active) => run(() => setActive({ id: s.id, active }).unwrap(), { success: `${s.name} ${active ? "activated" : "deactivated"}` }),
            }),
          ]}
        />
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
          canCreate ? (
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
