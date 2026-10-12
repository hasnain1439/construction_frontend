"use client";

import { Pencil, Plus, Tags } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useUpdateWorkerTypeMutation } from "@/api/services/masterData.api";
import type { WorkerTypeRow } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useLanguage, useT } from "@/i18n/useT";
import { otherTypeNames, pickTypeName } from "@/lib/workerTypes";
import { activeToggleAction } from "../components/ActiveToggle";
import { WorkerTypeSlideOver } from "../components/WorkerTypeSlideOver";
import { useAllWorkerTypes } from "@/hooks/useWorkerTypes";

/** "1.5×" — or "—" when the type has no overtime multiplier. */
export const formatMultiplier = (value: number | null | undefined) => (value ? `${Number(value.toFixed(2))}×` : "—");

export function WorkerTypesView() {
  const t = useT();
  const language = useLanguage();
  const readOnly = useReadOnly();
  // Same rule as labour rates: only the owner edits.
  const canEdit = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const { data, isLoading, isFetching, error, refetch } = useAllWorkerTypes();
  const [update, { isLoading: toggling }] = useUpdateWorkerTypeMutation();
  const [showInactive, setShowInactive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WorkerTypeRow | null>(null);
  const run = useMutationToast();
  const switchId = useId();

  const rows = data ? (showInactive ? data : data.filter((row) => row.isActive)) : undefined;
  const inactiveCount = (data ?? []).filter((row) => !row.isActive).length;

  const columns: Column<WorkerTypeRow>[] = [
    {
      id: "name",
      header: t("workerTypes.colName"),
      sortValue: (row) => pickTypeName(row, language),
      cell: (row) => {
        const others = otherTypeNames(row, language);
        return (
          <div className="min-w-0">
            <p className="font-medium">
              <bdi>{pickTypeName(row, language)}</bdi>
            </p>
            {others.length ? (
              <p className="text-xs text-muted-foreground">
                {others.map((name, i) => (
                  <span key={name}>
                    {i ? " · " : null}
                    <bdi>{name}</bdi>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "rate",
      header: t("workerTypes.colRate"),
      align: "right",
      sortValue: (row) => Number(row.ratePaisa),
      cell: (row) => <MoneyText paisa={row.ratePaisa} />,
    },
    {
      id: "overtime",
      header: t("workerTypes.colOvertime"),
      align: "right",
      sortValue: (row) => row.overtimeMultiplier ?? 0,
      cell: (row) => (
        <span className="tabular" dir="ltr">
          {formatMultiplier(row.overtimeMultiplier)}
        </span>
      ),
    },
    {
      id: "workers",
      header: t("workerTypes.colWorkers"),
      align: "right",
      sortValue: (row) => row.workerCount,
      cell: (row) =>
        row.workerCount ? (
          <Link href="/workforce/workers" className="tabular text-primary underline-offset-4 hover:underline">
            {row.workerCount}
          </Link>
        ) : (
          <span className="tabular text-muted-foreground">0</span>
        ),
    },
    {
      id: "status",
      header: t("common.status"),
      sortValue: (row) => (row.isActive ? 0 : 1),
      cell: (row) => <StatusBadge domain="active" value={row.isActive} label={row.isActive ? t("common.active") : t("common.inactive")} />,
    },
    {
      ...ACTIONS_COLUMN,
      header: <span className="sr-only">{t("common.actions")}</span>,
      hidden: !canEdit,
      cell: (row) => {
        const name = pickTypeName(row, language);
        return (
          <RowActions
            name={name}
            actions={[
              { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(row) },
              activeToggleAction({
                name,
                isActive: row.isActive,
                loading: toggling,
                labels: { activate: t("workerTypes.activate"), deactivate: t("workerTypes.deactivate"), title: t("workerTypes.deactivateTitle", { name }) },
                consequence: t("workerTypes.deactivateBody"),
                onToggle: (active) =>
                  run(() => update({ id: row.id, body: { isActive: active } }).unwrap(), {
                    success: t(active ? "workerTypes.activated" : "workerTypes.deactivated", { name }),
                  }),
              }),
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t("workerTypes.title")}
        description={t("workerTypes.description")}
        breadcrumbs={[{ label: t("workerTypes.workforce") }, { label: t("workerTypes.title") }]}
        actions={
          canEdit ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              {t("workerTypes.add")}
            </Button>
          ) : null
        }
      />
      <FilterBar>
        <div className="flex items-center gap-2">
          <Switch id={switchId} checked={showInactive} onCheckedChange={setShowInactive} />
          <Label htmlFor={switchId} className="text-sm font-normal">
            {t("workerTypes.showInactive")}
            {inactiveCount ? <span className="ms-1 text-muted-foreground tabular">({inactiveCount})</span> : null}
          </Label>
        </div>
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          clientPageSize={25}
          empty={{
            title: t("workerTypes.emptyTitle"),
            description: t("workerTypes.emptyDesc"),
            icon: Tags,
            ...(canEdit
              ? {
                  action: (
                    <Button onClick={() => setAddOpen(true)}>
                      <Plus data-icon="inline-start" />
                      {t("workerTypes.add")}
                    </Button>
                  ),
                }
              : {}),
          }}
        />
      </SectionCard>
      <WorkerTypeSlideOver
        open={addOpen || Boolean(editing)}
        workerType={editing}
        onOpenChange={(o) => {
          if (o) return;
          setAddOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
