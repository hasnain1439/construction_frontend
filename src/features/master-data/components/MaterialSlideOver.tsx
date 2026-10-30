"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateMaterialMutation,
  useGetBrandsQuery,
  useGetMaterialGroupsQuery,
  useGetQualityCategoriesQuery,
  useGetSupplierCategoriesQuery,
  useSetMaterialSupplierCategoriesMutation,
  useUpdateMaterialMutation,
} from "@/api/services/masterData.api";
import { useCan } from "@/components/common/PermissionGate";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Material } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { materialSchema } from "../schemas";
import { AltUnitsEditor } from "./AltUnitsEditor";

const FORM_ID = "material-form";
type Values = z.input<typeof materialSchema>;

const empty: Values = { name: "", groupId: "", unit: "", unitDetail: "", altUnits: [], supplyCategory: "GREY_STRUCTURE", brandId: null, qualityId: null };
const fromMaterial = (m: Material): Values => ({
  name: m.name,
  groupId: m.group.id,
  unit: m.unit,
  unitDetail: m.unitDetail ?? "",
  altUnits: m.altUnits.map((a) => ({ unit: a.unit, factor: a.factor })),
  supplyCategory: m.supplyCategory,
  brandId: m.brand?.id ?? null,
  qualityId: m.quality?.id ?? null,
});

/**
 * Add / edit a company material (a product): group, brand, quality and units; with supplier-category
 * rights also which kinds of dealers sell it. Catalog materials keep their unit.
 */
export function MaterialSlideOver({
  open,
  material,
  onOpenChange,
}: {
  open: boolean;
  /** null = add a new material. */
  material: Material | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const te = useEnumT();
  const groups = useGetMaterialGroupsQuery(undefined, { skip: !open });
  const [create, { isLoading: creating }] = useCreateMaterialMutation();
  const [update, { isLoading: updating }] = useUpdateMaterialMutation();
  const brands = useGetBrandsQuery(undefined, { skip: !open });
  const qualities = useGetQualityCategoriesQuery(undefined, { skip: !open });
  const canSetCategories = useCan("masterdata.supplier.manage");
  const supplierCategories = useGetSupplierCategoriesQuery(undefined, { skip: !open || !canSetCategories });
  const [setCategories, { isLoading: settingCategories }] = useSetMaterialSupplierCategoriesMutation();
  // The categories that carry this material now (null = untouched, keep as is).
  const [chosenCategories, setChosenCategories] = useState<Set<string> | null>(null);
  const current = new Set((supplierCategories.data ?? []).filter((c) => material && c.materials.some((m) => m.id === material.id)).map((c) => c.id));
  const chosen = chosenCategories ?? current;
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    values: material ? fromMaterial(material) : empty,
  });
  const unitLocked = material?.source === "PLATFORM";
  // Flow: group → that group's brands (a brand without groups fits any) → quality → name / unit.
  const groupId = useWatch({ control: form.control, name: "groupId" });
  const brandOptions = (brands.data ?? []).filter((b) => !groupId || !b.groups.length || b.groups.some((g) => g.id === groupId)).map((b) => ({ value: b.id, label: b.name }));

  const onSubmit = async (values: z.output<typeof materialSchema>) => {
    const altUnits = values.altUnits.map((a) => ({ unit: a.unit, factor: a.factor }));
    const result = material
      ? await run(
          () =>
            update({
              id: material.id,
              body: {
                name: values.name,
                groupId: values.groupId,
                ...(unitLocked ? {} : { unit: values.unit }),
                unitDetail: values.unitDetail || null,
                altUnits,
                supplyCategory: values.supplyCategory,
                brandId: values.brandId,
                qualityId: values.qualityId,
              },
            }).unwrap(),
          { success: t("masterData.common.saved", { name: values.name }), setError: form.setError, codeFields: { MATERIAL_EXISTS: "name", UNIT_LOCKED: "unit" } },
        )
      : await run(
          () =>
            create({
              name: values.name,
              groupId: values.groupId,
              unit: values.unit,
              ...(values.unitDetail ? { unitDetail: values.unitDetail } : {}),
              altUnits,
              supplyCategory: values.supplyCategory,
              ...(values.brandId ? { brandId: values.brandId } : {}),
              ...(values.qualityId ? { qualityId: values.qualityId } : {}),
            }).unwrap(),
          { success: t("masterData.common.added", { name: values.name }), setError: form.setError, codeFields: { MATERIAL_EXISTS: "name", INVALID_GROUP: "groupId" } },
        );
    if (result && canSetCategories && chosenCategories) {
      await run(() => setCategories({ id: result.id, categoryIds: [...chosenCategories] }).unwrap());
    }
    if (result) {
      setChosenCategories(null);
      onOpenChange(false);
    }
  };
  const toggleCategory = (id: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(id);
    else next.delete(id);
    setChosenCategories(next);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={material ? t("masterData.common.editTitle", { name: material.name }) : t("masterData.materials.add")}
      description={material?.source === "PLATFORM" ? t("masterData.materials.platformDesc") : undefined}
      busy={creating || updating || settingCategories}
      footer={<FormActions formId={FORM_ID} submitLabel={material ? t("masterData.materials.save") : t("masterData.materials.add")} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <SelectField
          name="groupId"
          label={t("masterData.common.group")}
          required
          options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))}
          onValueChange={(next) => {
            const brandId = form.getValues("brandId");
            const brand = (brands.data ?? []).find((b) => b.id === brandId);
            if (brand && brand.groups.length && !brand.groups.some((g) => g.id === next)) form.setValue("brandId", null);
          }}
          hint={
            <Link href="/suppliers-stock/groups" className="text-primary hover:underline">
              {t("masterData.products.manageGroups")}
            </Link>
          }
        />
        <FieldGrid>
          <SelectField
            name="brandId"
            label={t("masterData.products.brand")}
            noneLabel={t("masterData.products.noBrand")}
            options={brandOptions}
            disabled={!groupId}
            hint={
              <Link href="/suppliers-stock/brands" className="text-primary hover:underline">
                {t("masterData.products.manageBrands")}
              </Link>
            }
          />
          <SelectField
            name="qualityId"
            label={t("masterData.products.quality")}
            noneLabel={t("masterData.products.noQuality")}
            options={(qualities.data ?? []).filter((q) => !q.isArchived).map((q) => ({ value: q.id, label: q.name }))}
          />
        </FieldGrid>
        <TextField name="name" label={t("field.name")} required placeholder={t("masterData.materials.namePlaceholder")} />
        <FormSection title={t("masterData.materials.units")}>
          {unitLocked ? <InlineAlert tone="info">{t("masterData.materials.unitLocked")}</InlineAlert> : null}
          <FieldGrid>
            <TextField name="unit" label={t("field.unit")} required placeholder={t("masterData.materials.unitPlaceholder")} disabled={unitLocked} />
            <TextField name="unitDetail" label={t("masterData.materials.unitDetail")} placeholder={t("masterData.materials.unitDetailPlaceholder")} />
          </FieldGrid>
          <AltUnitsEditor />
        </FormSection>
        <SegmentedField
          name="supplyCategory"
          label={t("masterData.materials.supplyCategory")}
          required
          options={[
            { value: "GREY_STRUCTURE", label: te("supplyCategory", "GREY_STRUCTURE") },
            { value: "FINISHING", label: te("supplyCategory", "FINISHING") },
          ]}
        />
        {canSetCategories && supplierCategories.data?.length ? (
          <FormSection title={t("masterData.products.soldBy")}>
            <p className="text-sm text-muted-foreground">{t("masterData.products.soldByHint")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {supplierCategories.data.map((c) => (
                <Label key={c.id} className="flex cursor-pointer items-center gap-2 font-normal">
                  <Checkbox checked={chosen.has(c.id)} onCheckedChange={(on) => toggleCategory(c.id, on === true)} />
                  {c.name}
                </Label>
              ))}
            </div>
          </FormSection>
        ) : null}
      </Form>
    </SlideOver>
  );
}
