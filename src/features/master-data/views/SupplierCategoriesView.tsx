"use client";

import { History, Package, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useCreateSupplierCategoryMutation,
  useDeleteSupplierCategoryMutation,
  useGetMaterialsQuery,
  useGetSupplierCategoriesQuery,
  useSetSupplierCategoryMaterialsMutation,
  useGetSupplierCategoryActivityQuery,
  useUpdateSupplierCategoryMutation,
} from "@/api/services/masterData.api";
import type { SupplierCategory } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { SlideOver } from "@/components/common/SlideOver";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    if (item.action === "supplier_category.delete") {
      const to = d["movedTo"] ?? d["mergedInto"];
      return to ? t("masterData.supplierCategories.deletedMoved", { n: Number(d["suppliersMoved"] ?? 0), to: String(to) }) : t("masterData.supplierCategories.deletedItem");
    }
    if (item.action === "supplier_category.restore") return t("masterData.supplierCategories.restored");
    if (item.action === "supplier_category.materials") {
      const list = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]).map(String) : []);
      return [
        list("added").length ? t("masterData.supplierCategories.productsAdded", { names: list("added").join(", ") }) : null,
        list("removed").length ? t("masterData.supplierCategories.productsRemoved", { names: list("removed").join(", ") }) : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
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

/** The category's products: tick materials (Settings → Materials), grouped like the materials list. */
function ProductsPanel({ category, readOnly, onClose }: { category: SupplierCategory; readOnly: boolean; onClose: () => void }) {
  const t = useT();
  const { data: materials, isLoading } = useGetMaterialsQuery();
  const [save, { isLoading: saving }] = useSetSupplierCategoryMaterialsMutation();
  const run = useMutationToast();
  const [chosen, setChosen] = useState(() => new Set(category.materials.map((m) => m.id)));
  const [search, setSearch] = useState("");
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Array<{ id: string; name: string; unit: string }>>();
    for (const m of materials ?? []) {
      if (q && !m.name.toLowerCase().includes(q) && !m.group.name.toLowerCase().includes(q)) continue;
      map.set(m.group.name, [...(map.get(m.group.name) ?? []), m]);
    }
    return [...map.entries()];
  }, [materials, search]);
  const toggle = (id: string, on: boolean) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("masterData.supplierCategories.productsTitle", { name: category.name })}
      description={t("masterData.supplierCategories.productsHint")}
      busy={saving}
      footer={
        readOnly ? undefined : (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{t("masterData.supplierCategories.selectedCount", { n: chosen.size })}</span>
            <Button
              disabled={saving}
              onClick={async () => {
                const ok = await run(() => save({ id: category.id, materialIds: [...chosen] }).unwrap(), { success: t("masterData.supplierCategories.productsSaved") });
                if (ok) onClose();
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("masterData.supplierCategories.searchProducts")} />
        {isLoading ? <p className="text-sm text-muted-foreground">…</p> : null}
        {groups.map(([group, items]) => (
          <fieldset key={group} className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</legend>
            {items.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1 hover:bg-muted/50">
                <Checkbox checked={chosen.has(m.id)} disabled={readOnly} onCheckedChange={(on) => toggle(m.id, on === true)} />
                <span className="text-sm">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.unit}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </SlideOver>
  );
}

/** Delete: a category in use asks where its suppliers go. */
function DeleteDialog({ category, others, onClose }: { category: SupplierCategory; others: SupplierCategory[]; onClose: () => void }) {
  const t = useT();
  const [remove, { isLoading }] = useDeleteSupplierCategoryMutation();
  const run = useMutationToast();
  const [moveTo, setMoveTo] = useState("");
  const inUse = category.supplierCount > 0;
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      tone="danger"
      title={t("masterData.common.deleteTitle", { name: category.name })}
      description={t("masterData.supplierCategories.deleteDesc2")}
      confirmLabel={t("common.delete")}
      loading={isLoading}
      confirmDisabled={inUse && !moveTo}
      onConfirm={async () => {
        const ok = await run(() => remove({ id: category.id, ...(inUse ? { moveTo } : {}) }).unwrap(), {
          success: t("masterData.common.deleted", { name: category.name }),
        });
        if (ok) onClose();
      }}
    >
      {inUse ? (
        <div className="space-y-1.5">
          <Label htmlFor="move-to-category">{t("masterData.supplierCategories.moveTo")}</Label>
          <Select value={moveTo} onValueChange={setMoveTo}>
            <SelectTrigger id="move-to-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {others.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("masterData.supplierCategories.moveToHint", { n: category.supplierCount })}</p>
        </div>
      ) : null}
    </ConfirmDialog>
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

type Tab = "active" | "deleted";

export function SupplierCategoriesView() {
  const t = useT();
  const readOnly = useReadOnly();
  const [tab, setTab] = useState<Tab>("active");
  const active = useGetSupplierCategoriesQuery();
  const deletedQuery = useGetSupplierCategoriesQuery({ deleted: true }, { skip: tab !== "deleted" });
  const { data, isLoading, isFetching, error, refetch } = tab === "active" ? active : deletedQuery;
  const [editing, setEditing] = useState<SupplierCategory | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<SupplierCategory | null>(null);
  const [history, setHistory] = useState<SupplierCategory | null>(null);
  const [products, setProducts] = useState<SupplierCategory | null>(null);

  const name: Column<SupplierCategory> = { id: "name", header: t("masterData.supplierCategories.name"), sortValue: (c) => c.name, cell: (c) => <span className="font-medium">{c.name}</span> };
  const addedBy: Column<SupplierCategory> = {
    id: "addedBy",
    header: t("masterData.supplierCategories.addedBy"),
    sortValue: (c) => c.createdAt,
    cell: (c) => <WhoWhen name={c.createdBy} at={c.createdAt} fallback={t("masterData.supplierCategories.auto")} />,
  };
  const activityAction = (c: SupplierCategory) => ({ label: t("masterData.supplierCategories.activity"), icon: History, onSelect: () => setHistory(c) });

  const activeColumns: Column<SupplierCategory>[] = [
    name,
    {
      id: "products",
      header: t("masterData.supplierCategories.products"),
      sortValue: (c) => c.materials.length,
      cell: (c) =>
        c.materials.length ? (
          <span className="text-sm">
            {c.materials
              .slice(0, 3)
              .map((m) => m.name)
              .join(", ")}
            {c.materials.length > 3 ? <span className="text-muted-foreground"> {t("masterData.supplierCategories.moreProducts", { n: c.materials.length - 3 })}</span> : null}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("masterData.supplierCategories.noProducts")}</span>
        ),
    },
    { id: "suppliers", header: t("masterData.supplierCategories.suppliers"), align: "right", sortValue: (c) => c.supplierCount, cell: (c) => <span className="tabular">{c.supplierCount}</span> },
    addedBy,
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
            { label: t("masterData.supplierCategories.products"), icon: Package, onSelect: () => setProducts(c) },
            activityAction(c),
            { label: t("masterData.supplierCategories.rename"), icon: Pencil, onSelect: () => setEditing(c), hidden: readOnly },
            { label: t("common.delete"), icon: Trash2, destructive: true, onSelect: () => setDeleting(c), hidden: readOnly },
          ]}
        />
      ),
    },
  ];

  const deletedColumns: Column<SupplierCategory>[] = [
    name,
    addedBy,
    {
      id: "deletedBy",
      header: t("masterData.supplierCategories.deletedBy"),
      sortValue: (c) => c.deletedAt ?? "",
      cell: (c) => <WhoWhen name={c.deletedBy} at={c.deletedAt} fallback="—" />,
    },
    { ...ACTIONS_COLUMN, cell: (c) => <RowActions name={c.name} actions={[activityAction(c)]} /> },
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
      <div className="mb-4">
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          ariaLabel={t("masterData.supplierCategories.title")}
          options={[
            { value: "active", label: t("masterData.supplierCategories.activeTab") },
            { value: "deleted", label: t("masterData.supplierCategories.deletedTab") },
          ]}
        />
      </div>
      <SectionCard flush>
        <DataTable
          rows={data}
          columns={tab === "active" ? activeColumns : deletedColumns}
          getRowId={(c) => c.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={
            tab === "active"
              ? { title: t("masterData.supplierCategories.emptyTitle"), description: t("masterData.supplierCategories.emptyDesc"), icon: Tags }
              : { title: t("masterData.supplierCategories.emptyDeleted"), icon: Trash2 }
          }
        />
      </SectionCard>
      {products ? <ProductsPanel key={products.id} category={products} readOnly={readOnly} onClose={() => setProducts(null)} /> : null}
      {history ? <ActivityPanel key={history.id} category={history} onClose={() => setHistory(null)} /> : null}
      {adding ? <NameDialog category={null} open onClose={() => setAdding(false)} /> : null}
      {editing ? <NameDialog key={editing.id} category={editing} open onClose={() => setEditing(null)} /> : null}
      {deleting ? (
        <DeleteDialog
          key={deleting.id}
          category={deleting}
          others={(active.data ?? []).filter((c) => c.id !== deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
