"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookMarked, Boxes, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useCreateCatalogMaterialMutation, useGetCatalogGroupsQuery, useGetCatalogMaterialsQuery, useUpdateCatalogMaterialMutation } from "@/api/services/admin/catalog.api";
import type { CatalogMaterial } from "@/api/types";
import { CollapsibleSection } from "@/components/common/CollapsibleSection";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { AltUnitsEditor } from "@/features/master-data/components/AltUnitsEditor";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatAltUnits, SUPPLY_CATEGORY_LABEL, toOptions } from "@/lib/options";
import { catalogMaterialSchema } from "../schemas";

const FORM_ID = "catalog-material-form";
type Values = z.input<typeof catalogMaterialSchema>;

const toValues = (m: CatalogMaterial | null): Values => ({
  groupId: m?.group.id ?? "",
  name: m?.name ?? "",
  unit: m?.unit ?? "",
  unitDetail: m?.unitDetail ?? "",
  altUnits: (m?.altUnits ?? []).map((a) => ({ unit: a.unit, factor: a.factor })),
  supplyCategory: m?.supplyCategory ?? "GREY_STRUCTURE",
  usedByRulebook: m?.usedByRulebook ?? false,
  rulebookKey: m?.rulebookKey ?? "",
  sortOrder: m?.sortOrder ?? null,
  pushToTenants: true,
  isActive: m?.isActive ?? true,
});

function CatalogSlideOver({ material, open, onOpenChange }: { material: CatalogMaterial | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const groups = useGetCatalogGroupsQuery(undefined, { skip: !open });
  const [create, { isLoading: creating }] = useCreateCatalogMaterialMutation();
  const [update, { isLoading: updating }] = useUpdateCatalogMaterialMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof catalogMaterialSchema>>({ resolver: zodResolver(catalogMaterialSchema), values: toValues(material) });

  const onSubmit = async (v: z.output<typeof catalogMaterialSchema>) => {
    const altUnits = v.altUnits.map((a) => ({ unit: a.unit, factor: a.factor }));
    const result = material
      ? await run(
          () =>
            update({
              id: material.id,
              body: {
                name: v.name,
                unitDetail: v.unitDetail || null,
                altUnits,
                supplyCategory: v.supplyCategory,
                usedByRulebook: v.usedByRulebook,
                isActive: v.isActive,
                ...(v.sortOrder !== null ? { sortOrder: v.sortOrder } : {}),
              },
            }).unwrap(),
          { success: (m) => `${m.name} saved${m.propagatedTo ? ` · updated in ${m.propagatedTo} companies` : ""}`, setError: form.setError, codeFields: { PLATFORM_MATERIAL_EXISTS: "name" } },
        )
      : await run(
          () =>
            create({
              groupId: v.groupId,
              name: v.name,
              unit: v.unit,
              ...(v.unitDetail ? { unitDetail: v.unitDetail } : {}),
              altUnits,
              supplyCategory: v.supplyCategory,
              usedByRulebook: v.usedByRulebook,
              ...(v.rulebookKey ? { rulebookKey: v.rulebookKey } : {}),
              ...(v.sortOrder !== null ? { sortOrder: v.sortOrder } : {}),
              pushToTenants: v.pushToTenants,
            }).unwrap(),
          { success: (m) => `${m.name} added${m.pushedTo ? ` · pushed to ${m.pushedTo} companies` : ""}`, setError: form.setError, codeFields: { PLATFORM_MATERIAL_EXISTS: "name" } },
        );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={material ? `Edit ${material.name}` : "Add catalog material"}
      description={material ? "Name and units update in companies that haven't customised this material." : "Every new company gets the catalog automatically."}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={material ? "Save material" : "Add material"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <SelectField name="groupId" label="Group" required disabled={Boolean(material)} options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
        <TextField name="name" label="Name" required />
        <FormSection title="Units">
          <FieldGrid>
            <TextField name="unit" label="Unit" required disabled={Boolean(material)} hint={material ? "Companies have rates in this unit — it can't change." : "e.g. bag, ton, cft"} />
            <TextField name="unitDetail" label="Unit detail" placeholder="1 bag = 50 kg" />
          </FieldGrid>
          <AltUnitsEditor />
        </FormSection>
        <SegmentedField name="supplyCategory" label="Supply category" required options={[{ value: "GREY_STRUCTURE", label: "Grey structure" }, { value: "FINISHING", label: "Finishing" }]} />
        <FieldGrid>
          <ToggleField name="usedByRulebook" label="Used by rulebook" />
          <TextField name="rulebookKey" label="Rulebook key" disabled={Boolean(material)} placeholder="cement_opc" />
        </FieldGrid>
        <NumberField name="sortOrder" label="Sort order" decimals={0} />
        {material ? (
          <ToggleField name="isActive" label="Active" description="Inactive materials aren't copied to new companies." />
        ) : (
          <ToggleField name="pushToTenants" label="Add to every company now" description="Companies that already have a material with this name keep theirs." />
        )}
      </Form>
    </SlideOver>
  );
}

export function CatalogView() {
  const [search, setSearch] = useState("");
  const [supplyCategory, setSupplyCategory] = useState("");
  const [isActive, setIsActive] = useState("");
  const groups = useGetCatalogGroupsQuery();
  const { data, isLoading, isFetching, error, refetch } = useGetCatalogMaterialsQuery({
    ...(search ? { search } : {}),
    ...(supplyCategory ? { supplyCategory: supplyCategory as CatalogMaterial["supplyCategory"] } : {}),
    ...(isActive ? { isActive: isActive as "true" | "false" } : {}),
  });
  const [editing, setEditing] = useState<CatalogMaterial | null>(null);
  const [adding, setAdding] = useState(false);

  const byGroup = useMemo(() => {
    const map = new Map<string, CatalogMaterial[]>();
    for (const m of data ?? []) map.set(m.group.id, [...(map.get(m.group.id) ?? []), m]);
    return (groups.data ?? []).map((g) => ({ group: g, rows: map.get(g.id) ?? [] })).filter((g) => g.rows.length);
  }, [data, groups.data]);

  const columns: Column<CatalogMaterial>[] = [
    { id: "name", header: "Material", cell: (m) => <span className="font-medium">{m.name}</span>, sortValue: (m) => m.name },
    { id: "unit", header: "Unit", cell: (m) => m.unit },
    { id: "detail", header: "Unit detail", cell: (m) => m.unitDetail ?? "—" },
    { id: "alt", header: "Other units", cell: (m) => (m.altUnits.length ? <span className="text-xs">{formatAltUnits(m.unit, m.altUnits)}</span> : "—") },
    { id: "supply", header: "Supply", cell: (m) => SUPPLY_CATEGORY_LABEL[m.supplyCategory] },
    { id: "rulebook", header: "Rulebook", cell: (m) => (m.usedByRulebook ? <StatusBadge tone="info" icon={BookMarked} label={m.rulebookKey ?? "Used"} /> : "—") },
    { id: "companies", header: "Companies", align: "right", cell: (m) => <span className="tabular">{m.companies ?? 0}</span> },
    { id: "status", header: "Status", cell: (m) => <StatusBadge domain="active" value={m.isActive} /> },
    {
      id: "edit",
      header: <span className="sr-only">Edit</span>,
      align: "right",
      cell: (m) => (
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${m.name}`} onClick={() => setEditing(m)}>
          <Pencil />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Material Catalog"
        description="The platform default list every company starts with."
        breadcrumbs={[{ label: "Material Catalog" }]}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" />
            Add material
          </Button>
        }
      />
      <FilterBar
        onClear={() => {
          setSearch("");
          setSupplyCategory("");
          setIsActive("");
        }}
        canClear={Boolean(search || supplyCategory || isActive)}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search materials…" />
        <FilterSelect label="Supply" value={supplyCategory} onChange={setSupplyCategory} options={toOptions(SUPPLY_CATEGORY_LABEL)} />
        <FilterSelect label="Status" value={isActive} onChange={setIsActive} options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]} />
      </FilterBar>
      <SectionCard flush>
        {isLoading || groups.isLoading ? (
          <TableSkeleton />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} compact />
        ) : !byGroup.length ? (
          <EmptyState compact icon={Boxes} title="No materials match" />
        ) : (
          <div aria-busy={isFetching || undefined}>
            {byGroup.map(({ group, rows }) => (
              <CollapsibleSection key={group.id} title={group.name} count={rows.length} meta={<span className="text-xs font-normal text-muted-foreground">{group.section === "CIVIL" ? "Civil" : "Finishing"}</span>}>
                <DataTable rows={rows} columns={columns} getRowId={(m) => m.id} clientPageSize={0} empty={{ title: "Empty" }} />
              </CollapsibleSection>
            ))}
          </div>
        )}
      </SectionCard>
      <CatalogSlideOver
        material={editing}
        open={adding || Boolean(editing)}
        onOpenChange={(o) => {
          if (o) return;
          setAdding(false);
          setEditing(null);
        }}
      />
    </>
  );
}
