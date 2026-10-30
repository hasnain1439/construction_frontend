"use client";

import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateSupplierCategoryMutation,
  useDeleteSupplierCategoryMutation,
  useGetSupplierCategoriesQuery,
  useUpdateSupplierCategoryMutation,
} from "@/api/services/masterData.api";
import type { SupplierCategory } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";

/** Add (category = null) or rename one category; a name that matches another category merges the two. */
function NameDialog({ category, open, onClose }: { category: SupplierCategory | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const [create, { isLoading: creating }] = useCreateSupplierCategoryMutation();
  const [update, { isLoading: updating }] = useUpdateSupplierCategoryMutation();
  const run = useMutationToast();
  const [name, setName] = useState(category?.name ?? "");
  const trimmed = name.trim();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={category ? t("masterData.supplierCategories.renameTitle", { name: category.name }) : t("masterData.supplierCategories.add")}
      description={category ? t("masterData.supplierCategories.renameHint") : undefined}
      confirmLabel={t("common.save")}
      loading={creating || updating}
      confirmDisabled={trimmed.length < 2 || trimmed === category?.name}
      onConfirm={async () => {
        const result = category
          ? await run(() => update({ id: category.id, name: trimmed }).unwrap(), {
              success: (r) => (r.mergedFromId ? t("masterData.supplierCategories.merged", { name: r.name }) : t("masterData.supplierCategories.renamed")),
            })
          : await run(() => create({ name: trimmed }).unwrap(), { success: t("masterData.common.added", { name: trimmed }) });
        if (result) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="supplier-category-name">{t("masterData.supplierCategories.name")}</Label>
        <Input
          id="supplier-category-name"
          value={name}
          maxLength={40}
          autoFocus
          placeholder={t("masterData.supplierCategories.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}

export function SupplierCategoriesView() {
  const t = useT();
  const readOnly = useReadOnly();
  const { data, isLoading, isFetching, error, refetch } = useGetSupplierCategoriesQuery();
  const [remove, { isLoading: removing }] = useDeleteSupplierCategoryMutation();
  const run = useMutationToast();
  const [editing, setEditing] = useState<SupplierCategory | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<SupplierCategory | null>(null);

  const columns: Column<SupplierCategory>[] = [
    { id: "name", header: t("masterData.supplierCategories.name"), sortValue: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
    { id: "suppliers", header: t("masterData.supplierCategories.suppliers"), align: "right", sortValue: (c) => c.supplierCount, cell: (c) => <span className="tabular">{c.supplierCount}</span> },
    {
      ...ACTIONS_COLUMN,
      hidden: readOnly,
      cell: (c) => (
        <RowActions
          name={c.name}
          actions={[
            { label: t("masterData.supplierCategories.rename"), icon: Pencil, onSelect: () => setEditing(c) },
            {
              label: t("common.delete"),
              icon: Trash2,
              destructive: true,
              disabled: c.supplierCount > 0,
              hint: c.supplierCount > 0 ? t("masterData.supplierCategories.inUse") : undefined,
              onSelect: () => setDeleting(c),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.supplierCategories.title")}
        description={t("masterData.supplierCategories.description")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("masterData.supplierCategories.title") }]}
        actions={
          readOnly ? null : (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("masterData.supplierCategories.add")}
            </Button>
          )
        }
      />
      <SectionCard flush>
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(c) => c.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t("masterData.supplierCategories.emptyTitle"), description: t("masterData.supplierCategories.emptyDesc"), icon: Tags }}
        />
      </SectionCard>
      {adding ? <NameDialog category={null} open onClose={() => setAdding(false)} /> : null}
      {editing ? <NameDialog key={editing.id} category={editing} open onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={t("masterData.common.deleteTitle", { name: deleting?.name ?? "" })}
        description={t("masterData.supplierCategories.deleteDesc")}
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
