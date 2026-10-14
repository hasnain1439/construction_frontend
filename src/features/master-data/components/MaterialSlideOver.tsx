"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useCreateMaterialMutation, useGetMaterialGroupsQuery, useUpdateMaterialMutation } from "@/api/services/masterData.api";
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

const empty: Values = { name: "", groupId: "", unit: "", unitDetail: "", altUnits: [], supplyCategory: "GREY_STRUCTURE" };
const fromMaterial = (m: Material): Values => ({
  name: m.name,
  groupId: m.group.id,
  unit: m.unit,
  unitDetail: m.unitDetail ?? "",
  altUnits: m.altUnits.map((a) => ({ unit: a.unit, factor: a.factor })),
  supplyCategory: m.supplyCategory,
});

/** Add / edit a company material. Catalog materials keep their unit. */
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
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof materialSchema>>({
    resolver: zodResolver(materialSchema),
    values: material ? fromMaterial(material) : empty,
  });
  const unitLocked = material?.source === "PLATFORM";

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
            }).unwrap(),
          { success: t("masterData.common.added", { name: values.name }), setError: form.setError, codeFields: { MATERIAL_EXISTS: "name", INVALID_GROUP: "groupId" } },
        );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={material ? t("masterData.common.editTitle", { name: material.name }) : t("masterData.materials.add")}
      description={material?.source === "PLATFORM" ? t("masterData.materials.platformDesc") : undefined}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={material ? t("masterData.materials.save") : t("masterData.materials.add")} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label={t("field.name")} required placeholder={t("masterData.materials.namePlaceholder")} />
        <SelectField name="groupId" label={t("masterData.common.group")} required options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
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
      </Form>
    </SlideOver>
  );
}
