"use client";

import { ImportButton } from "@/features/onboarding/components/ImportWizard";
import { Eye, EyeOff, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useDeleteMaterialMutation,
  useGetMaterialsQuery,
  useHideMaterialMutation,
  useShowMaterialMutation,
} from "@/api/services/masterData.api";
import type { Material } from "@/api/types";
import { CollapsibleSection } from "@/components/common/CollapsibleSection";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { useEnumT, useT } from "@/i18n/useT";
import { formatAltUnits, SUPPLY_CATEGORY_LABEL } from "@/lib/options";
import { MaterialSlideOver } from "../components/MaterialSlideOver";

export function MaterialsView() {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const canCreate = useCan("masterdata.material.create") && !readOnly;
  const canEdit = useCan("masterdata.material.edit") && !readOnly;
  const canHide = useCan("masterdata.material.manage") && !readOnly;
  const [search, setSearch] = useState("");
  const [supplyCategory, setSupplyCategory] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const { data, isLoading, isFetching, error, refetch } = useGetMaterialsQuery({
    ...(search ? { search } : {}),
    ...(supplyCategory ? { supplyCategory: supplyCategory as Material["supplyCategory"] } : {}),
    includeHidden: showHidden ? "true" : "false",
  });
  const [hide] = useHideMaterialMutation();
  const [show] = useShowMaterialMutation();
  const [remove, { isLoading: deleting }] = useDeleteMaterialMutation();
  const [addOpen, setAddOpen] = useSearchFlag();
  const [editing, setEditing] = useState<Material | null>(null);
  const [toDelete, setToDelete] = useState<Material | null>(null);
  const run = useMutationToast();

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; rows: Material[] }>();
    for (const m of data ?? []) {
      const entry = map.get(m.group.id) ?? { name: m.group.name, rows: [] };
      entry.rows.push(m);
      map.set(m.group.id, entry);
    }
    return [...map.entries()];
  }, [data]);

  const columns: Column<Material>[] = [
    { id: "name", header: t("field.material"), cell: (m) => <span className="font-medium">{m.name}</span>, sortValue: (m) => m.name },
    { id: "unit", header: t("field.unit"), cell: (m) => m.unit },
    { id: "detail", header: t("masterData.materials.unitDetail"), cell: (m) => m.unitDetail ?? <span className="text-muted-foreground">—</span> },
    {
      id: "alt",
      header: t("masterData.altUnits.title"),
      cell: (m) => (m.altUnits.length ? <bdi dir="ltr" className="text-xs">{formatAltUnits(m.unit, m.altUnits)}</bdi> : <span className="text-muted-foreground">—</span>),
    },
    { id: "category", header: t("masterData.materials.supplyCategory"), cell: (m) => te("supplyCategory", m.supplyCategory) },
    {
      id: "source",
      header: t("masterData.materials.source"),
      cell: (m) => <StatusBadge tone={m.source === "PLATFORM" ? "neutral" : "info"} label={m.source === "PLATFORM" ? t("masterData.materials.platform") : t("masterData.materials.company")} />,
    },
    { id: "status", header: t("field.status"), cell: (m) => <StatusBadge domain="visibility" value={m.isHidden} /> },
    {
      ...ACTIONS_COLUMN,
      hidden: !canEdit && !canHide,
      cell: (m) => (
        <RowActions
          name={m.name}
          actions={[
            { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(m) },
            {
              label: m.isHidden ? t("masterData.materials.show") : t("masterData.materials.hide"),
              icon: m.isHidden ? Eye : EyeOff,
              hidden: !canHide,
              onSelect: () =>
                void run(() => (m.isHidden ? show(m.id) : hide(m.id)).unwrap(), {
                  success: m.isHidden ? t("masterData.materials.visibleAgain", { name: m.name }) : t("masterData.materials.hidden", { name: m.name }),
                }),
            },
            m.source === "COMPANY"
              ? { label: t("common.delete"), icon: Trash2, destructive: true, separatorBefore: true, hidden: !canHide, onSelect: () => setToDelete(m) }
              : {
                  label: t("common.delete"),
                  icon: Trash2,
                  disabled: true,
                  separatorBefore: true,
                  hidden: !canHide,
                  hint: t("masterData.materials.catalogNoDelete"),
                },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.materials.title")}
        description={t("masterData.materials.description")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("masterData.materials.title") }]}
        actions={
          <>
            <ImportButton entity="materials" />
            {canCreate ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus data-icon="inline-start" />
                {t("masterData.materials.add")}
              </Button>
            ) : null}
          </>
        }
      />
      <FilterBar
        onClear={() => {
          setSearch("");
          setSupplyCategory("");
        }}
        canClear={Boolean(search || supplyCategory)}
        trailing={
          <div className="flex items-center gap-2 px-2">
            <Switch id="show-hidden" checked={showHidden} onCheckedChange={setShowHidden} />
            <Label htmlFor="show-hidden" className="text-sm">
              {t("masterData.materials.showHidden")}
            </Label>
          </div>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder={t("masterData.common.searchMaterials")} />
        <FilterSelect
          label={t("masterData.materials.supply")}
          value={supplyCategory}
          onChange={setSupplyCategory}
          options={Object.keys(SUPPLY_CATEGORY_LABEL).map((value) => ({ value, label: te("supplyCategory", value) }))}
        />
      </FilterBar>
      <SectionCard flush>
        {isLoading ? (
          <TableSkeleton />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} compact />
        ) : groups.length === 0 ? (
          <EmptyState compact icon={Package} title={t("masterData.materials.emptyTitle")} description={t("masterData.materials.emptyDesc")} />
        ) : (
          <div aria-busy={isFetching || undefined}>
            {groups.map(([groupId, group]) => (
              <CollapsibleSection key={groupId} title={group.name} count={group.rows.length}>
                <DataTable rows={group.rows} columns={columns} getRowId={(m) => m.id} clientPageSize={0} empty={{ title: t("masterData.common.empty") }} />
              </CollapsibleSection>
            ))}
          </div>
        )}
      </SectionCard>
      <MaterialSlideOver open={addOpen || Boolean(editing)} material={editing} onOpenChange={(o) => {
          if (o) return;
          setAddOpen(false);
          setEditing(null);
        }} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t("masterData.common.deleteTitle", { name: toDelete?.name ?? t("masterData.materials.thisMaterial") })}
        description={t("masterData.materials.deleteDesc")}
        confirmLabel={t("masterData.materials.deleteConfirm")}
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          // MATERIAL_IN_USE explains itself in the error toast ("…you can hide it instead").
          await run(() => remove(toDelete.id).unwrap(), { success: t("masterData.common.deleted", { name: toDelete.name }) });
          setToDelete(null);
        }}
      />
    </>
  );
}
