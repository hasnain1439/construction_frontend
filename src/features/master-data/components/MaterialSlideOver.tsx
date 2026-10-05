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
          { success: `${values.name} saved`, setError: form.setError, codeFields: { MATERIAL_EXISTS: "name", UNIT_LOCKED: "unit" } },
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
          { success: `${values.name} added`, setError: form.setError, codeFields: { MATERIAL_EXISTS: "name", INVALID_GROUP: "groupId" } },
        );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={material ? `Edit ${material.name}` : "Add material"}
      description={material?.source === "PLATFORM" ? "From the platform catalog — your changes apply to your company only." : undefined}
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel={material ? "Save material" : "Add material"} loading={creating || updating} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField name="name" label="Name" required placeholder="Cement Fauji 40 kg" />
        <SelectField name="groupId" label="Group" required options={(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))} />
        <FormSection title="Units">
          {unitLocked ? <InlineAlert tone="info">The unit of a catalog material can&apos;t change.</InlineAlert> : null}
          <FieldGrid>
            <TextField name="unit" label="Unit" required placeholder="bag" disabled={unitLocked} />
            <TextField name="unitDetail" label="Unit detail" placeholder="1 bag = 50 kg" />
          </FieldGrid>
          <AltUnitsEditor />
        </FormSection>
        <SegmentedField
          name="supplyCategory"
          label="Supply category"
          required
          options={[
            { value: "GREY_STRUCTURE", label: "Grey structure" },
            { value: "FINISHING", label: "Finishing" },
          ]}
        />
      </Form>
    </SlideOver>
  );
}
