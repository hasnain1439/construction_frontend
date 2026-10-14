"use client";

import { Archive, Copy, History, MoreHorizontal, Pencil, Percent, Plus, RotateCcw, Save, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useArchiveQualityCategoryMutation,
  useGetMaterialGroupsQuery,
  useGetPriceListQuery,
  useGetQualityCategoriesQuery,
  useUpdatePriceListMutation,
  useUpdateQualityCategoryMutation,
} from "@/api/services/masterData.api";
import type { PriceListItem, QualityCategory } from "@/api/types";
import { CollapsibleSection } from "@/components/common/CollapsibleSection";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InlineAlert } from "@/components/common/InlineAlert";
import { InlineEditCell } from "@/components/common/InlineEditCell";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatPKR, paisaToRupees, rupeesToPaisa } from "@/lib/money";
import { useEnumT, useT } from "@/i18n/useT";
import { BulkPercentDialog } from "../components/BulkPercentDialog";
import { AddCategoryDialog, DuplicateCategoryDialog, RenameCategoryDialog } from "../components/CategoryDialogs";
import { RateHistorySlideOver } from "../components/RateHistorySlideOver";

interface Draft {
  ratePaisa?: string;
  specification?: string | null;
}

function CategoryTabs({
  categories,
  selectedId,
  onSelect,
  canManage,
  onAdd,
  onRename,
  onDuplicate,
  onDefault,
  onArchive,
}: {
  categories: QualityCategory[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  canManage: boolean;
  onAdd: () => void;
  onRename: (c: QualityCategory) => void;
  onDuplicate: (c: QualityCategory) => void;
  onDefault: (c: QualityCategory) => void;
  onArchive: (c: QualityCategory) => void;
}) {
  const t = useT();
  return (
    <div role="tablist" aria-label={t("masterData.priceList.tabsAria")} className="flex flex-wrap items-center gap-2">
      {categories.map((c) => {
        const active = c.id === selectedId;
        return (
          <div
            key={c.id}
            className={cn(
              "flex items-center rounded-full border bg-card pe-1 shadow-card transition-colors",
              active ? "border-primary bg-accent text-primary" : "hover:bg-muted",
            )}
          >
            <button type="button" role="tab" aria-selected={active} onClick={() => onSelect(c.id)} className="flex items-center gap-2 py-2 pe-1 ps-4 text-sm font-medium">
              {c.name}
              {c.isDefault ? <Star className="size-3.5 fill-current text-amber" aria-label={t("masterData.common.defaultBadge")} /> : null}
              {typeof c.ratedMaterials === "number" ? <span className="text-xs text-muted-foreground tabular">{c.ratedMaterials}</span> : null}
            </button>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-xs" aria-label={t("masterData.priceList.optionsAria", { name: c.name })}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => onRename(c)}>
                    <Pencil />
                    {t("masterData.priceList.rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDuplicate(c)}>
                    <Copy />
                    {t("masterData.categories.duplicate")}
                  </DropdownMenuItem>
                  {!c.isDefault ? (
                    <DropdownMenuItem onSelect={() => onDefault(c)}>
                      <Star />
                      {t("masterData.priceList.setDefault")}
                    </DropdownMenuItem>
                  ) : null}
                  {!c.isDefault ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => onArchive(c)}>
                        <Archive />
                        {t("masterData.priceList.archive")}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        );
      })}
      {canManage ? (
        <Button variant="outline" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          {t("masterData.categories.add")}
        </Button>
      ) : null}
    </div>
  );
}

export function PriceListView() {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const canEdit = useCan("masterdata.pricelist.manage") && !readOnly;
  const categories = useGetQualityCategoriesQuery();
  const groups = useGetMaterialGroupsQuery();
  const [selected, setSelected] = useState<string | undefined>();
  const defaultId = categories.data?.find((c) => c.isDefault)?.id;
  const categoryId = selected ?? defaultId;
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const priceList = useGetPriceListQuery(
    { ...(categoryId ? { categoryId } : {}), ...(search ? { search } : {}), ...(groupId ? { groupId } : {}) },
    { skip: !categories.data },
  );
  const [save, { isLoading: saving }] = useUpdatePriceListMutation();
  const [updateCategory] = useUpdateQualityCategoryMutation();
  const [archive, { isLoading: archiving }] = useArchiveQualityCategoryMutation();
  const run = useMutationToast();

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedBanner, setSavedBanner] = useState<number | null>(null);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<QualityCategory | null>(null);
  const [duplicating, setDuplicating] = useState<QualityCategory | null>(null);
  const [archiving_, setArchiving] = useState<QualityCategory | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<PriceListItem["material"] | null>(null);

  const dirtyCount = Object.keys(drafts).length;
  const items = priceList.data?.items;

  const bySection = useMemo(() => {
    const map = new Map<string, PriceListItem[]>();
    for (const item of items ?? []) {
      const key = item.material.group.section;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  const setDraft = (item: PriceListItem, patch: Draft) => {
    setSavedBanner(null);
    setDrafts((current) => {
      const next = { ...current, [item.material.id]: { ...current[item.material.id], ...patch } };
      const d = next[item.material.id];
      const sameRate = d.ratePaisa === undefined || d.ratePaisa === item.ratePaisa;
      const sameSpec = d.specification === undefined || (d.specification ?? null) === (item.specification ?? null);
      if (sameRate && sameSpec) delete next[item.material.id];
      return next;
    });
  };

  const selectTab = (id: string) => {
    if (id === categoryId) return;
    if (dirtyCount) setPendingTab(id);
    else setSelected(id);
  };

  const saveAll = async () => {
    if (!categoryId || !items) return;
    const missingRate = Object.entries(drafts).find(([materialId, d]) => {
      const item = items.find((i) => i.material.id === materialId);
      return !(d.ratePaisa ?? item?.ratePaisa);
    });
    if (missingRate) {
      const name = items.find((i) => i.material.id === missingRate[0])?.material.name;
      toast.error(t("masterData.priceList.missingRate", { name: name ?? "" }));
      return;
    }
    const rates = Object.entries(drafts).map(([materialId, d]) => {
      const item = items.find((i) => i.material.id === materialId);
      const specification = d.specification !== undefined ? d.specification : (item?.specification ?? null);
      return { materialId, ratePaisa: (d.ratePaisa ?? item?.ratePaisa) as string, specification };
    });
    const result = await run(() => save({ categoryId, rates }).unwrap(), {
      success: (r) => (r.changed === 1 ? t("masterData.common.oneRateSaved") : t("masterData.common.nRatesSaved", { n: r.changed })),
    });
    if (result) {
      setDrafts({});
      setSavedBanner(result.changed);
    }
  };

  const category = categories.data?.find((c) => c.id === categoryId);

  const columns: Column<PriceListItem>[] = [
    {
      id: "material",
      header: t("field.material"),
      cell: (i) => (
        <div className="min-w-0">
          <p className="font-medium">{i.material.name}</p>
          <p className="text-xs text-muted-foreground">{i.material.group.name}</p>
        </div>
      ),
      sortValue: (i) => i.material.name,
    },
    {
      id: "spec",
      header: t("masterData.common.specification"),
      className: "min-w-56",
      cell: (i) => {
        const d = drafts[i.material.id];
        const value = d?.specification !== undefined ? (d.specification ?? "") : (i.specification ?? "");
        return canEdit ? (
          <InlineEditCell
            ariaLabel={t("masterData.priceList.specAria", { name: i.material.name })}
            value={value}
            placeholder={t("masterData.priceList.addSpec")}
            dirty={d?.specification !== undefined}
            onCommit={(next) => setDraft(i, { specification: next.trim() || null })}
            validate={(v) => (v.length > 200 ? t("masterData.v.specMax") : null)}
          />
        ) : (
          value || <span className="text-muted-foreground">—</span>
        );
      },
    },
    { id: "unit", header: t("field.unit"), cell: (i) => <span title={i.material.unitDetail ?? undefined}>{i.material.unit}</span> },
    {
      id: "rate",
      header: t("field.rate"),
      align: "right",
      className: "w-44",
      sortValue: (i) => Number(drafts[i.material.id]?.ratePaisa ?? i.ratePaisa ?? -1),
      cell: (i) => {
        const d = drafts[i.material.id];
        const rate = d?.ratePaisa ?? i.ratePaisa;
        return canEdit ? (
          <InlineEditCell
            ariaLabel={t("masterData.common.rateAria", { name: i.material.name })}
            value={rate ? paisaToRupees(rate) : ""}
            display={rate ? formatPKR(rate) : undefined}
            placeholder={t("masterData.priceList.setRate")}
            prefix="Rs"
            inputMode="decimal"
            align="right"
            dirty={d?.ratePaisa !== undefined}
            validate={(v) => (rupeesToPaisa(v) === null || v.trim().startsWith("-") ? t("masterData.v.rupees") : null)}
            onCommit={(next) => {
              const paisa = rupeesToPaisa(next);
              if (paisa) setDraft(i, { ratePaisa: paisa });
            }}
          />
        ) : rate ? (
          <span className="tabular">{formatPKR(rate)}</span>
        ) : (
          <span className="text-muted-foreground">{t("masterData.priceList.notSet")}</span>
        );
      },
    },
    {
      id: "updated",
      header: t("masterData.priceList.lastUpdated"),
      cell: (i) =>
        i.lastUpdatedAt ? (
          <div className="text-xs">
            <p>{formatDate(i.lastUpdatedAt)}</p>
            <p className="text-muted-foreground">{i.lastUpdatedBy?.name}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      ...ACTIONS_COLUMN,
      cell: (i) => <RowActions name={i.material.name} actions={[{ label: t("masterData.common.rateHistory"), icon: History, onSelect: () => setHistoryFor(i.material) }]} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.priceList.title")}
        description={t("masterData.priceList.description")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("masterData.priceList.title") }]}
        actions={
          canEdit ? (
            <>
              {dirtyCount ? (
                <Button variant="outline" onClick={() => setDrafts({})}>
                  <RotateCcw data-icon="inline-start" />
                  {t("action.discard")}
                </Button>
              ) : null}
              <Button onClick={() => void saveAll()} disabled={!dirtyCount || saving}>
                <Save data-icon="inline-start" />
                {dirtyCount ? t("masterData.common.saveChangesCount", { n: dirtyCount }) : t("common.saveChanges")}
              </Button>
            </>
          ) : null
        }
      />
      {categories.isLoading ? (
        <TableSkeleton rows={1} columns={4} />
      ) : categories.error ? (
        <ErrorState error={categories.error} onRetry={categories.refetch} />
      ) : (
        <CategoryTabs
          categories={categories.data ?? []}
          selectedId={categoryId}
          onSelect={selectTab}
          canManage={canEdit}
          onAdd={() => setAdding(true)}
          onRename={setRenaming}
          onDuplicate={setDuplicating}
          onDefault={(c) => run(() => updateCategory({ id: c.id, body: { isDefault: true } }).unwrap(), { success: t("masterData.common.isNowDefault", { name: c.name }) })}
          onArchive={setArchiving}
        />
      )}
      {savedBanner !== null ? (
        <InlineAlert tone="success" title={t("masterData.priceList.ratesChanged")}>
          {savedBanner === 1
            ? t("masterData.priceList.oneSavedBanner", { category: category?.name ?? "" })
            : t("masterData.priceList.nSavedBanner", { n: savedBanner, category: category?.name ?? "" })}
        </InlineAlert>
      ) : null}
      <FilterBar
        onClear={() => {
          setSearch("");
          setGroupId("");
        }}
        canClear={Boolean(search || groupId)}
        trailing={
          canEdit && category ? (
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Percent data-icon="inline-start" />
              {t("masterData.priceList.bulk")}
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder={t("masterData.common.searchMaterials")} />
        <FilterSelect label={t("masterData.common.group")} value={groupId} onChange={setGroupId} options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
        {category ? <StatusBadge tone="info" label={category.code} /> : null}
      </FilterBar>
      <SectionCard flush>
        {priceList.isLoading || !categories.data ? (
          <TableSkeleton />
        ) : priceList.error && !priceList.data ? (
          <ErrorState error={priceList.error} onRetry={priceList.refetch} compact />
        ) : bySection.length === 0 ? (
          <EmptyState compact title={t("masterData.priceList.emptyTitle")} description={t("masterData.priceList.emptyDesc")} />
        ) : (
          bySection.map(([section, rows]) => (
            <CollapsibleSection key={section} title={te("section", section)} count={rows.length}>
              <DataTable rows={rows} columns={columns} getRowId={(i) => i.material.id} clientPageSize={0} empty={{ title: t("masterData.common.empty") }} />
            </CollapsibleSection>
          ))
        )}
      </SectionCard>

      <AddCategoryDialog open={adding} onOpenChange={setAdding} categories={categories.data ?? []} onCreated={(c) => setSelected(c.id)} />
      <RenameCategoryDialog category={renaming} onClose={() => setRenaming(null)} />
      <DuplicateCategoryDialog category={duplicating} onClose={() => setDuplicating(null)} onCreated={(c) => setSelected(c.id)} />
      {category ? <BulkPercentDialog open={bulkOpen} onOpenChange={setBulkOpen} category={category} groups={groups.data ?? []} /> : null}
      <RateHistorySlideOver material={historyFor} categoryId={categoryId} onClose={() => setHistoryFor(null)} />
      <ConfirmDialog
        open={Boolean(archiving_)}
        onOpenChange={(o) => !o && setArchiving(null)}
        title={t("masterData.priceList.archiveTitle", { name: archiving_?.name ?? t("masterData.priceList.thisCategory") })}
        description={t("masterData.priceList.archiveDesc")}
        confirmLabel={t("masterData.priceList.archive")}
        loading={archiving}
        onConfirm={async () => {
          if (!archiving_) return;
          const ok = await run(() => archive(archiving_.id).unwrap(), { success: t("masterData.priceList.archived", { name: archiving_.name }) });
          if (ok) {
            if (selected === archiving_.id) setSelected(undefined);
            setArchiving(null);
          }
        }}
      />
      <ConfirmDialog
        open={pendingTab !== null}
        onOpenChange={(o) => !o && setPendingTab(null)}
        title={t("masterData.priceList.discardTitle")}
        description={
          dirtyCount === 1
            ? t("masterData.priceList.oneUnsaved", { category: category?.name ?? "" })
            : t("masterData.priceList.nUnsaved", { n: dirtyCount, category: category?.name ?? "" })
        }
        confirmLabel={t("masterData.priceList.discardSwitch")}
        onConfirm={() => {
          setDrafts({});
          setSelected(pendingTab ?? undefined);
          setPendingTab(null);
        }}
      />
    </>
  );
}
