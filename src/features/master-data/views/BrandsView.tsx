"use client";

import { BadgeCheck, History, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateBrandMutation,
  useDeleteBrandMutation,
  useGetBrandActivityQuery,
  useGetBrandsQuery,
  useGetMaterialGroupsQuery,
  useUpdateBrandMutation,
} from "@/api/services/masterData.api";
import type { Brand } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
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

const CLEAR = "__clear__";

/** Name over date; an automatic row says so. */
function WhoWhen({ name, at, fallback }: { name: string | null; at: string | null; fallback: string }) {
  if (!at) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="min-w-0">
      <p className={name ? "text-sm" : "text-sm text-muted-foreground"}>{name ?? fallback}</p>
      <p className="text-xs text-muted-foreground">{formatDateTime(at)}</p>
    </div>
  );
}

/** Add (brand = null) or edit: name and the groups it makes products in; another brand's name merges the two. */
function NameDialog({ brand, onClose }: { brand: Brand | null; onClose: () => void }) {
  const t = useT();
  const [create, { isLoading: creating }] = useCreateBrandMutation();
  const [update, { isLoading: updating }] = useUpdateBrandMutation();
  const groups = useGetMaterialGroupsQuery();
  const run = useMutationToast();
  const [name, setName] = useState(brand?.name ?? "");
  const [groupIds, setGroupIds] = useState(() => new Set(brand?.groups.map((g) => g.id) ?? []));
  const trimmed = name.trim();
  const groupsChanged = !brand || [...groupIds].sort().join() !== brand.groups.map((g) => g.id).sort().join();
  const toggle = (id: string, on: boolean) =>
    setGroupIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={brand ? t("masterData.products.renameBrand", { name: brand.name }) : t("masterData.products.addBrand")}
      description={brand ? t("masterData.products.renameBrandHint") : undefined}
      confirmLabel={t("common.save")}
      loading={creating || updating}
      confirmDisabled={trimmed.length < 2 || (trimmed === brand?.name && !groupsChanged)}
      onConfirm={async () => {
        const result = brand
          ? await run(() => update({ id: brand.id, ...(trimmed !== brand.name ? { name: trimmed } : {}), ...(groupsChanged ? { groupIds: [...groupIds] } : {}) }).unwrap(), {
              success: (r) => (r.mergedFromId ? t("masterData.products.mergedInto", { name: r.name }) : t("masterData.products.brandSaved")),
            })
          : await run(() => create({ name: trimmed, groupIds: [...groupIds] }).unwrap(), { success: t("masterData.common.added", { name: trimmed }) });
        if (result) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="brand-name">{t("masterData.products.brandName")}</Label>
        <Input id="brand-name" value={name} maxLength={60} autoFocus placeholder={t("masterData.products.brandPlaceholder")} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium">{t("masterData.products.brandGroups")}</p>
        <p className="text-xs text-muted-foreground">{t("masterData.products.brandGroupsHint")}</p>
        <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
          {(groups.data ?? []).map((g) => (
            <Label key={g.id} className="flex cursor-pointer items-center gap-2 font-normal">
              <Checkbox checked={groupIds.has(g.id)} onCheckedChange={(on) => toggle(g.id, on === true)} />
              {g.name}
            </Label>
          ))}
        </div>
      </div>
    </ConfirmDialog>
  );
}

/** Delete; a brand on products asks: move them to another brand, or leave them without one. */
function DeleteDialog({ brand, others, onClose }: { brand: Brand; others: Brand[]; onClose: () => void }) {
  const t = useT();
  const [remove, { isLoading }] = useDeleteBrandMutation();
  const run = useMutationToast();
  const [target, setTarget] = useState("");
  const inUse = brand.productCount > 0;
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      tone="danger"
      title={t("masterData.common.deleteTitle", { name: brand.name })}
      description={t("masterData.products.deleteBrandDesc")}
      confirmLabel={t("common.delete")}
      loading={isLoading}
      confirmDisabled={inUse && !target}
      onConfirm={async () => {
        const body = !inUse ? { id: brand.id } : target === CLEAR ? { id: brand.id, clear: true } : { id: brand.id, moveTo: target };
        const ok = await run(() => remove(body).unwrap(), { success: t("masterData.common.deleted", { name: brand.name }) });
        if (ok) onClose();
      }}
    >
      {inUse ? (
        <div className="space-y-1.5">
          <Label htmlFor="brand-move">{t("masterData.products.moveProducts")}</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger id="brand-move" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLEAR}>{t("masterData.products.clearBrand")}</SelectItem>
              {others.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {t("masterData.products.moveTo")}: {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("masterData.products.brandInUse", { n: brand.productCount })}</p>
        </div>
      ) : null}
    </ConfirmDialog>
  );
}

function ActivityPanel({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const t = useT();
  const query = useGetBrandActivityQuery(brand.id);
  const describe = (action: string, d: Record<string, unknown>) => {
    const n = Number(d["productsMoved"] ?? 0);
    if (action === "brand.rename") return t("masterData.products.actRenamed", { from: String(d["from"] ?? ""), to: String(d["to"] ?? "") });
    if (action === "brand.merge") return t("masterData.products.actMerged", { from: String(d["from"] ?? ""), n });
    if (action === "brand.restore") return t("masterData.products.actRestored");
    if (action === "brand.groups") return t("masterData.products.actGroups", { to: Array.isArray(d["to"]) ? (d["to"] as unknown[]).join(", ") || "—" : "—" });
    if (action === "brand.delete") {
      const to = d["movedTo"] ?? d["mergedInto"];
      if (to) return t("masterData.products.actDeletedMoved", { n, to: String(to) });
      return n ? t("masterData.products.actDeletedCleared", { n }) : t("masterData.products.actDeleted");
    }
    return t("masterData.products.actCreated");
  };
  return (
    <SlideOver open onOpenChange={(o) => !o && onClose()} title={t("masterData.supplierCategories.activityTitle", { name: brand.name })}>
      <QueryState query={query}>
        {(activity) => (
          <ol className="space-y-4">
            {activity.items.map((item) => (
              <li key={item.id} className="border-s-2 border-border ps-3">
                <p className="text-sm font-medium">{describe(item.action, item.details ?? {})}</p>
                <p className="text-xs text-muted-foreground">
                  {item.by} · {formatDateTime(item.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </QueryState>
    </SlideOver>
  );
}

type Tab = "active" | "deleted";

/** Brands: add / rename (merge) / delete, who did what, and a deleted list. */
export function BrandsView() {
  const t = useT();
  const readOnly = useReadOnly();
  const canAdd = useCan("masterdata.material.create") && !readOnly;
  const canManage = useCan("masterdata.material.manage") && !readOnly;
  const [tab, setTab] = useState<Tab>("active");
  const active = useGetBrandsQuery();
  const deleted = useGetBrandsQuery({ deleted: true }, { skip: tab !== "deleted" });
  const { data, isLoading, isFetching, error, refetch } = tab === "active" ? active : deleted;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [history, setHistory] = useState<Brand | null>(null);

  const name: Column<Brand> = { id: "name", header: t("masterData.products.brandName"), sortValue: (b) => b.name, cell: (b) => <span className="font-medium">{b.name}</span> };
  const addedBy: Column<Brand> = {
    id: "addedBy",
    header: t("masterData.supplierCategories.addedBy"),
    sortValue: (b) => b.createdAt,
    cell: (b) => <WhoWhen name={b.createdBy} at={b.createdAt} fallback={t("masterData.supplierCategories.auto")} />,
  };
  const activity = (b: Brand) => ({ label: t("masterData.supplierCategories.activity"), icon: History, onSelect: () => setHistory(b) });

  const activeColumns: Column<Brand>[] = [
    name,
    {
      id: "groups",
      header: t("masterData.products.groups"),
      cell: (b) => (b.groups.length ? <span className="text-sm">{b.groups.map((g) => g.name).join(", ")}</span> : <span className="text-sm text-muted-foreground">{t("masterData.products.anyGroup")}</span>),
    },
    { id: "products", header: t("masterData.products.products"), align: "right", sortValue: (b) => b.productCount, cell: (b) => <span className="tabular">{b.productCount}</span> },
    addedBy,
    { id: "changed", header: t("masterData.supplierCategories.lastChanged"), sortValue: (b) => b.updatedAt ?? "", cell: (b) => <WhoWhen name={b.updatedBy} at={b.updatedAt} fallback="" /> },
    {
      ...ACTIONS_COLUMN,
      cell: (b) => (
        <RowActions
          name={b.name}
          actions={[
            activity(b),
            { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(b), hidden: !canManage },
            { label: t("common.delete"), icon: Trash2, destructive: true, onSelect: () => setDeleting(b), hidden: !canManage },
          ]}
        />
      ),
    },
  ];
  const deletedColumns: Column<Brand>[] = [
    name,
    addedBy,
    { id: "deletedBy", header: t("masterData.supplierCategories.deletedBy"), sortValue: (b) => b.deletedAt ?? "", cell: (b) => <WhoWhen name={b.deletedBy} at={b.deletedAt} fallback="—" /> },
    { ...ACTIONS_COLUMN, cell: (b) => <RowActions name={b.name} actions={[activity(b)]} /> },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.products.brandsTitle")}
        description={t("masterData.products.brandsDesc")}
        breadcrumbs={[{ label: t("crumb.suppliers") }, { label: t("masterData.products.brandsTitle") }]}
        actions={
          canAdd ? (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("masterData.products.addBrand")}
            </Button>
          ) : null
        }
      />
      <div className="mb-4">
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          ariaLabel={t("masterData.products.brandsTitle")}
          options={[
            { value: "active", label: t("masterData.products.brandsTitle") },
            { value: "deleted", label: t("masterData.supplierCategories.deletedTab") },
          ]}
        />
      </div>
      <SectionCard flush>
        <DataTable
          rows={data}
          columns={tab === "active" ? activeColumns : deletedColumns}
          getRowId={(b) => b.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={
            tab === "active"
              ? { title: t("masterData.products.emptyBrands"), description: t("masterData.products.emptyBrandsDesc"), icon: BadgeCheck }
              : { title: t("masterData.products.emptyDeletedBrands"), icon: Trash2 }
          }
        />
      </SectionCard>
      {adding ? <NameDialog brand={null} onClose={() => setAdding(false)} /> : null}
      {editing ? <NameDialog key={editing.id} brand={editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? <DeleteDialog key={deleting.id} brand={deleting} others={(active.data ?? []).filter((b) => b.id !== deleting.id)} onClose={() => setDeleting(null)} /> : null}
      {history ? <ActivityPanel key={history.id} brand={history} onClose={() => setHistory(null)} /> : null}
    </>
  );
}
