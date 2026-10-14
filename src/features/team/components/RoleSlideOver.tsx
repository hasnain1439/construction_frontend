"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useCreateRoleMutation,
  useGetRolesQuery,
  useUpdateRoleMutation,
} from "@/api/services/permissions.api";
import type { PermissionRole, RoleBaseRole } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { roleName } from "@/lib/permissionCatalog";

/** Example names for the per-language name fields (sample values, the same in every UI language). */
const NAME_EXAMPLE = { en: "Site PM", roman: "Site PM", urdu: "سائٹ پی ایم" };

const FORM_ID = "role-form";
const EMPTY = "__empty__";
const BASE_ROLES: RoleBaseRole[] = ["PM", "MUNSHI", "OTHER"];

function roleSchema(t: ReturnType<typeof useT>) {
  const name = z.string().trim().min(2, t("roles.nameRequired")).max(60, t("roles.nameRequired"));
  const optional = z.string().trim().max(60);
  return z.object({
    name,
    nameRoman: optional,
    nameUrdu: optional,
    description: z.string().trim().max(300),
    baseRole: z.enum(["PM", "MUNSHI", "OTHER"]),
    fromRoleId: z.string(),
  });
}
type Values = z.input<ReturnType<typeof roleSchema>>;
type Output = z.output<ReturnType<typeof roleSchema>>;

/**
 * Create a role (from a template / another role, or empty) or rename an existing custom role.
 * After creating, the editor opens so the permissions can be ticked.
 */
export function RoleSlideOver({
  open,
  role,
  onOpenChange,
}: {
  open: boolean;
  role: PermissionRole | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const schema = useMemo(() => roleSchema(t), [t]);
  const roles = useGetRolesQuery(undefined, { skip: !open || Boolean(role) });
  const [create, { isLoading: creating }] = useCreateRoleMutation();
  const [update, { isLoading: updating }] = useUpdateRoleMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    values: {
      name: role?.name ?? "",
      nameRoman: role?.nameRoman ?? "",
      nameUrdu: role?.nameUrdu ?? "",
      description: role?.description ?? "",
      baseRole: role?.baseRole ?? "PM",
      fromRoleId: EMPTY,
    },
  });

  const onSubmit = async (v: Output) => {
    const names = {
      name: v.name,
      nameRoman: v.nameRoman || undefined,
      nameUrdu: v.nameUrdu || undefined,
      description: v.description || undefined,
    };
    const options = {
      setError: form.setError,
      codeFields: { ROLE_NAME_TAKEN: "name", ROLE_IN_USE: "baseRole" },
    };
    if (role) {
      const saved = await run(
        () =>
          update({
            id: role.id,
            body: {
              ...names,
              nameRoman: v.nameRoman || null,
              nameUrdu: v.nameUrdu || null,
              description: v.description || null,
              baseRole: v.baseRole,
            },
          }).unwrap(),
        { ...options, success: (r) => t("roles.detailsSaved", { name: roleName(r, language) }) },
      );
      if (saved) onOpenChange(false);
      return;
    }
    const created = await run(
      () =>
        create({
          ...names,
          baseRole: v.baseRole,
          ...(v.fromRoleId !== EMPTY ? { fromRoleId: v.fromRoleId } : { permissions: [] }),
        }).unwrap(),
      { ...options, success: (r) => t("roles.created", { name: roleName(r, language) }) },
    );
    if (created) {
      onOpenChange(false);
      router.push(`/team/roles/${created.id}`);
    }
  };

  const busy = creating || updating;
  const sources = (roles.data ?? []).map((r) => ({ value: r.id, label: roleName(r, language) }));
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={role ? t("roles.renameTitle", { name: roleName(role, language) }) : t("roles.createTitle")}
      description={role ? undefined : t("roles.createDesc")}
      busy={busy}
      footer={
        <FormActions
          formId={FORM_ID}
          submitLabel={role ? t("roles.saveDetails") : t("roles.create")}
          loading={busy}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <TextField
          name="name"
          label={t("roles.nameEn")}
          required
          maxLength={60}
          dir="ltr"
          placeholder={NAME_EXAMPLE.en}
        />
        <FieldGrid>
          <TextField
            name="nameRoman"
            label={t("roles.nameRoman")}
            maxLength={60}
            dir="ltr"
            placeholder={NAME_EXAMPLE.roman}
          />
          <TextField
            name="nameUrdu"
            label={t("roles.nameUrdu")}
            maxLength={60}
            dir="rtl"
            placeholder={NAME_EXAMPLE.urdu}
          />
        </FieldGrid>
        <TextareaField name="description" label={t("roles.descriptionLabel")} maxLength={300} rows={2} />
        <SelectField
          name="baseRole"
          label={t("roles.baseRoleLabel")}
          required
          options={BASE_ROLES.map((b) => ({ value: b, label: t(`roles.baseRole.${b}`) }))}
        />
        {!role ? (
          <SelectField
            name="fromRoleId"
            label={t("roles.startFrom")}
            options={[{ value: EMPTY, label: t("roles.startEmpty") }, ...sources]}
          />
        ) : null}
      </Form>
    </SlideOver>
  );
}
