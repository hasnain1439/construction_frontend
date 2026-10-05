"use client";

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
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { formatAltUnits, SUPPLY_CATEGORY_LABEL, toOptions } from "@/lib/options";
import { MaterialSlideOver } from "../components/MaterialSlideOver";

export function MaterialsView() {
  const readOnly = useReadOnly();
  const canEdit = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const canHide = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
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
    { id: "name", header: "Material", cell: (m) => <span className="font-medium">{m.name}</span>, sortValue: (m) => m.name },
    { id: "unit", header: "Unit", cell: (m) => m.unit },
    { id: "detail", header: "Unit detail", cell: (m) => m.unitDetail ?? <span className="text-muted-foreground">—</span> },
    {
      id: "alt",
      header: "Other units",
      cell: (m) => (m.altUnits.length ? <span className="text-xs">{formatAltUnits(m.unit, m.altUnits)}</span> : <span className="text-muted-foreground">—</span>),
    },
    { id: "category", header: "Supply category", cell: (m) => SUPPLY_CATEGORY_LABEL[m.supplyCategory] },
    {
      id: "source",
      header: "Source",
      cell: (m) => <StatusBadge tone={m.source === "PLATFORM" ? "neutral" : "info"} label={m.source === "PLATFORM" ? "Platform" : "Company"} />,
    },
    { id: "status", header: "Status", cell: (m) => <StatusBadge domain="visibility" value={m.isHidden} /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      hidden: !canEdit,
      cell: (m) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${m.name}`} onClick={() => setEditing(m)}>
            <Pencil />
          </Button>
          {canHide ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.isHidden ? `Show ${m.name}` : `Hide ${m.name}`}
              title={m.isHidden ? "Show" : "Hide"}
              onClick={() =>
                run(() => (m.isHidden ? show(m.id) : hide(m.id)).unwrap(), {
                  success: m.isHidden ? `${m.name} is visible again` : `${m.name} hidden`,
                })
              }
            >
              {m.isHidden ? <Eye /> : <EyeOff />}
            </Button>
          ) : null}
          {canHide && m.source === "COMPANY" ? (
            <Button variant="ghost" size="icon-sm" className="text-danger" aria-label={`Delete ${m.name}`} onClick={() => setToDelete(m)}>
              <Trash2 />
            </Button>
          ) : canHide ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex size-8 items-center justify-center text-muted-foreground/50" aria-label="Catalog materials can't be deleted">
                  <Trash2 className="size-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Catalog materials can&apos;t be deleted. You can hide them instead.</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Materials"
        description="Your company's material catalog. Rates are set per quality category in the Price List."
        breadcrumbs={[{ label: "Settings" }, { label: "Materials" }]}
        actions={
          canEdit ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add material
            </Button>
          ) : null
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
              Show hidden
            </Label>
          </div>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search materials…" />
        <FilterSelect label="Supply" value={supplyCategory} onChange={setSupplyCategory} options={toOptions(SUPPLY_CATEGORY_LABEL)} />
      </FilterBar>
      <SectionCard flush>
        {isLoading ? (
          <TableSkeleton />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} compact />
        ) : groups.length === 0 ? (
          <EmptyState compact icon={Package} title="No materials found" description="Try another search, or add a material." />
        ) : (
          <div aria-busy={isFetching || undefined}>
            {groups.map(([groupId, group]) => (
              <CollapsibleSection key={groupId} title={group.name} count={group.rows.length}>
                <DataTable rows={group.rows} columns={columns} getRowId={(m) => m.id} clientPageSize={0} empty={{ title: "Empty" }} />
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
        title={`Delete ${toDelete?.name ?? "material"}?`}
        description="Only materials without rates or stock can be deleted. Otherwise, hide it."
        confirmLabel="Delete material"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          // MATERIAL_IN_USE explains itself in the error toast ("…you can hide it instead").
          await run(() => remove(toDelete.id).unwrap(), { success: `${toDelete.name} deleted` });
          setToDelete(null);
        }}
      />
    </>
  );
}
