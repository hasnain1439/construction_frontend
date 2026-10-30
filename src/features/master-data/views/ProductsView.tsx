"use client";

import { Package, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useGetBrandsQuery,
  useGetMaterialGroupsQuery,
  useGetMaterialsQuery,
  useGetQualityCategoriesQuery,
  useGetSupplierCategoriesQuery,
} from "@/api/services/masterData.api";
import type { Material } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";
import { MaterialSlideOver } from "../components/MaterialSlideOver";

const NONE = { groupId: "", brandId: "", qualityId: "", categoryId: "" };

/**
 * Products: every material with its brand, quality and the supplier categories that sell it. Same
 * rows as Settings → Materials, so purchases, stock and estimates stay on one list.
 */
export function ProductsView() {
  const t = useT();
  const readOnly = useReadOnly();
  const canCreate = useCan("masterdata.material.create") && !readOnly;
  const canEdit = useCan("masterdata.material.edit") && !readOnly;
  const canSeeCategories = useCan("masterdata.supplier.view");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(NONE);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);

  const query = useGetMaterialsQuery({
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(filters.groupId ? { groupId: filters.groupId } : {}),
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(filters.qualityId ? { qualityId: filters.qualityId } : {}),
  });
  const groups = useGetMaterialGroupsQuery();
  const brands = useGetBrandsQuery();
  const qualities = useGetQualityCategoriesQuery();
  const categories = useGetSupplierCategoriesQuery(undefined, { skip: !canSeeCategories });

  /** material id → names of the supplier categories that sell it */
  const soldBy = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of categories.data ?? []) for (const m of c.materials) map.set(m.id, [...(map.get(m.id) ?? []), c.name]);
    return map;
  }, [categories.data]);
  const inCategory = useMemo(() => {
    const c = (categories.data ?? []).find((x) => x.id === filters.categoryId);
    return c ? new Set(c.materials.map((m) => m.id)) : null;
  }, [categories.data, filters.categoryId]);
  const rows = (query.data ?? []).filter((m) => !inCategory || inCategory.has(m.id));
  const setFilter = (key: keyof typeof NONE, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const muted = (text: string) => <span className="text-muted-foreground">{text}</span>;
  const columns: Column<Material>[] = [
    {
      id: "name",
      header: t("masterData.products.product"),
      sortValue: (m) => m.name,
      cell: (m) => (
        <div className="min-w-0">
          <p className="font-medium">{m.name}</p>
          <p className="text-xs text-muted-foreground">
            {m.unit}
            {m.unitDetail ? ` · ${m.unitDetail}` : ""}
          </p>
        </div>
      ),
    },
    { id: "brand", header: t("masterData.products.brand"), sortValue: (m) => m.brand?.name ?? "", cell: (m) => m.brand?.name ?? muted("—") },
    { id: "quality", header: t("masterData.products.quality"), sortValue: (m) => m.quality?.name ?? "", cell: (m) => m.quality?.name ?? muted("—") },
    { id: "group", header: t("masterData.common.group"), sortValue: (m) => m.group.name, cell: (m) => m.group.name },
    {
      id: "soldBy",
      header: t("masterData.products.soldBy"),
      hidden: !canSeeCategories,
      cell: (m) => {
        const names = soldBy.get(m.id);
        return names?.length ? <span className="text-sm">{names.join(", ")}</span> : muted("—");
      },
    },
    {
      ...ACTIONS_COLUMN,
      hidden: !canEdit,
      cell: (m) => <RowActions name={m.name} actions={[{ label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(m) }]} />,
    },
  ];

  const isFiltered = Boolean(search.trim() || filters.groupId || filters.brandId || filters.qualityId || filters.categoryId);
  return (
    <>
      <PageHeader
        title={t("masterData.products.title")}
        description={t("masterData.products.description")}
        breadcrumbs={[{ label: t("crumb.suppliers") }, { label: t("masterData.products.title") }]}
        actions={
          canCreate ? (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("masterData.products.add")}
            </Button>
          ) : null
        }
      />
      <FilterBar
        onClear={() => {
          setSearch("");
          setFilters(NONE);
        }}
        canClear={isFiltered}
      >
        <SearchInput value={search} onChange={setSearch} placeholder={t("masterData.products.search")} />
        <FilterSelect label={t("masterData.common.group")} value={filters.groupId} onChange={(v) => setFilter("groupId", v)} options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
        <FilterSelect label={t("masterData.products.brand")} value={filters.brandId} onChange={(v) => setFilter("brandId", v)} options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))} />
        <FilterSelect
          label={t("masterData.products.quality")}
          value={filters.qualityId}
          onChange={(v) => setFilter("qualityId", v)}
          options={(qualities.data ?? []).filter((q) => !q.isArchived).map((q) => ({ value: q.id, label: q.name }))}
        />
        {canSeeCategories ? (
          <FilterSelect
            label={t("masterData.products.allCategories")}
            value={filters.categoryId}
            onChange={(v) => setFilter("categoryId", v)}
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
        ) : null}
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(m) => m.id}
          loading={query.isLoading || query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={canEdit ? (m) => setEditing(m) : undefined}
          empty={{ title: t("masterData.products.emptyTitle"), description: t("masterData.products.emptyDesc"), icon: Package }}
        />
      </SectionCard>
      <MaterialSlideOver
        open={adding || Boolean(editing)}
        material={editing}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setEditing(null);
          }
        }}
      />
    </>
  );
}
