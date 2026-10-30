"use client";

import { Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCreateUnitMutation, useDeleteUnitMutation, useGetUnitsQuery, useUpdateUnitMutation } from "@/api/services/masterData.api";
import type { MeasureUnit } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";

/** Add (unit = null) or rename a unit. */
function UnitDialog({ unit, onClose }: { unit: MeasureUnit | null; onClose: () => void }) {
  const t = useT();
  const [create, { isLoading: creating }] = useCreateUnitMutation();
  const [update, { isLoading: updating }] = useUpdateUnitMutation();
  const run = useMutationToast();
  const [name, setName] = useState(unit?.name ?? "");
  const trimmed = name.trim();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={unit ? t("masterData.products.editUnit", { name: unit.name }) : t("masterData.products.addUnit")}
      description={unit ? t("masterData.products.editUnitHint") : undefined}
      confirmLabel={t("common.save")}
      loading={creating || updating}
      confirmDisabled={!trimmed || trimmed === unit?.name}
      onConfirm={async () => {
        const result = unit
          ? await run(() => update({ id: unit.id, name: trimmed }).unwrap(), { success: t("masterData.products.unitSaved") })
          : await run(() => create({ name: trimmed }).unwrap(), { success: t("masterData.common.added", { name: trimmed }) });
        if (result) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="unit-name">{t("masterData.products.unitName")}</Label>
        <Input id="unit-name" value={name} maxLength={20} autoFocus placeholder={t("masterData.products.unitPlaceholder")} onChange={(e) => setName(e.target.value)} />
      </div>
    </ConfirmDialog>
  );
}

/** Units: just names (bag, kg, sqft, …); add / rename (products follow) / delete when unused. */
export function UnitsView() {
  const t = useT();
  const readOnly = useReadOnly();
  const canAdd = useCan("masterdata.material.create") && !readOnly;
  const canManage = useCan("masterdata.material.manage") && !readOnly;
  const { data, isLoading, isFetching, error, refetch } = useGetUnitsQuery();
  const [remove, { isLoading: removing }] = useDeleteUnitMutation();
  const run = useMutationToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MeasureUnit | null>(null);
  const [deleting, setDeleting] = useState<MeasureUnit | null>(null);

  const columns: Column<MeasureUnit>[] = [
    { id: "name", header: t("masterData.products.unitName"), sortValue: (u) => u.name, cell: (u) => <span className="font-medium">{u.name}</span> },
    {
      id: "type",
      header: t("masterData.materials.source"),
      cell: (u) => <StatusBadge tone={u.isDefault ? "neutral" : "info"} label={u.isDefault ? t("masterData.products.system") : t("masterData.products.company")} />,
    },
    { id: "products", header: t("masterData.products.products"), align: "right", sortValue: (u) => u.productCount, cell: (u) => <span className="tabular">{u.productCount}</span> },
    {
      ...ACTIONS_COLUMN,
      hidden: !canManage,
      cell: (u) => (
        <RowActions
          name={u.name}
          actions={[
            { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(u) },
            {
              label: t("common.delete"),
              icon: Trash2,
              destructive: true,
              disabled: u.productCount > 0,
              hint: u.productCount > 0 ? t("masterData.products.unitInUse") : undefined,
              onSelect: () => setDeleting(u),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.products.unitsTitle")}
        description={t("masterData.products.unitsDesc")}
        breadcrumbs={[{ label: t("crumb.suppliers") }, { label: t("masterData.products.unitsTitle") }]}
        actions={
          canAdd ? (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("masterData.products.addUnit")}
            </Button>
          ) : null
        }
      />
      <SectionCard flush>
        <DataTable rows={data} columns={columns} getRowId={(u) => u.id} loading={isLoading || isFetching} error={error} onRetry={refetch} empty={{ title: t("masterData.products.emptyUnits"), icon: Ruler }} />
      </SectionCard>
      {adding ? <UnitDialog unit={null} onClose={() => setAdding(false)} /> : null}
      {editing ? <UnitDialog key={editing.id} unit={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={t("masterData.common.deleteTitle", { name: deleting?.name ?? "" })}
        confirmLabel={t("common.delete")}
        loading={removing}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await run(() => remove(deleting.id).unwrap(), { success: t("masterData.common.deleted", { name: deleting.name }) });
          if (ok) setDeleting(null);
        }}
      />
    </>
  );
}
