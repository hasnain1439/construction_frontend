"use client";

import { History, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateSupplierCategoryMutation,
  useDeleteSupplierCategoryMutation,
  useGetSupplierCategoriesQuery,
  useGetSupplierCategoryActivityQuery,
  useUpdateSupplierCategoryMutation,
} from "@/api/services/masterData.api";
import type { SupplierCategory } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";
import { formatDateTime } from "@/lib/dates";

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

/** Who added the category, renamed it or merged another one into it, newest first. */
function ActivityPanel({ category, onClose }: { category: SupplierCategory; onClose: () => void }) {
  const t = useT();
  const query = useGetSupplierCategoryActivityQuery(category.id);
  const describe = (item: { action: string; details: Record<string, unknown> | null }) => {
    const d = item.details ?? {};
    if (item.action === "supplier_category.rename") return t("masterData.supplierCategories.renamed2", { from: String(d["from"] ?? ""), to: String(d["to"] ?? "") });
    if (item.action === "supplier_category.merge") return t("masterData.supplierCategories.mergedIn", { from: String(d["from"] ?? ""), n: Number(d["suppliersMoved"] ?? 0) });
    return t("masterData.supplierCategories.created");
  };
  return (
    <SlideOver open onOpenChange={(o) => !o && onClose()} title={t("masterData.supplierCategories.activityTitle", { name: category.name })}>
      <QueryState query={query}>
        {(activity) => (
          <ol className="space-y-4">
            {activity.items.map((item) => (
              <li key={item.id} className="border-s-2 border-border ps-3">
                <p className="text-sm font-medium">{describe(item)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.by} · {formatDateTime(item.at)}
                </p>
              </li>
            ))}
            {!activity.items.some((i) => i.action === "supplier_category.create") ? (
              <li className="border-s-2 border-border ps-3">
                <p className="text-sm font-medium">{t("masterData.supplierCategories.autoCreated")}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</p>
              </li>
            ) : null}
          </ol>
        )}
      </QueryState>
    </SlideOver>
  );
}

/** Name over date; an automatic category says so. */
function WhoWhen({ name, at, fallback }: { name: string | null; at: string | null; fallback: string }) {
  if (!at) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="min-w-0">
      <p className={name ? "text-sm" : "text-sm text-muted-foreground"}>{name ?? fallback}</p>
      <p className="text-xs text-muted-foreground">{formatDateTime(at)}</p>
    </div>
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
  const [history, setHistory] = useState<SupplierCategory | null>(null);

  const columns: Column<SupplierCategory>[] = [
    { id: "name", header: t("masterData.supplierCategories.name"), sortValue: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> },
    { id: "suppliers", header: t("masterData.supplierCategories.suppliers"), align: "right", sortValue: (c) => c.supplierCount, cell: (c) => <span className="tabular">{c.supplierCount}</span> },
    {
      id: "addedBy",
      header: t("masterData.supplierCategories.addedBy"),
      sortValue: (c) => c.createdAt,
      cell: (c) => <WhoWhen name={c.createdBy} at={c.createdAt} fallback={t("masterData.supplierCategories.auto")} />,
    },
    {
      id: "changed",
      header: t("masterData.supplierCategories.lastChanged"),
      sortValue: (c) => c.updatedAt ?? "",
      cell: (c) => <WhoWhen name={c.updatedBy} at={c.updatedAt} fallback="" />,
    },
    {
      ...ACTIONS_COLUMN,
      cell: (c) => (
        <RowActions
          name={c.name}
          actions={[
            { label: t("masterData.supplierCategories.activity"), icon: History, onSelect: () => setHistory(c) },
            { label: t("masterData.supplierCategories.rename"), icon: Pencil, onSelect: () => setEditing(c), hidden: readOnly },
            {
              label: t("common.delete"),
              icon: Trash2,
              destructive: true,
              disabled: c.supplierCount > 0,
              hint: c.supplierCount > 0 ? t("masterData.supplierCategories.inUse") : undefined,
              onSelect: () => setDeleting(c),
              hidden: readOnly,
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
      {history ? <ActivityPanel key={history.id} category={history} onClose={() => setHistory(null)} /> : null}
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
