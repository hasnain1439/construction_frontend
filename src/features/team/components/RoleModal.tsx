"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useCreateRoleMutation,
  useDuplicateRoleMutation,
  useGetPermissionCatalogQuery,
  useGetRoleQuery,
  useGetRolesQuery,
  useSetRolePermissionsMutation,
  useUpdateRoleMutation,
} from "@/api/services/permissions.api";
import type { PermissionCatalog, PermissionRole, RoleBaseRole } from "@/api/types";
import { ErrorState } from "@/components/common/ErrorState";
import { FormTabsList, TAB_CONTENT_CLASS } from "@/components/common/FormTabs";
import { InlineAlert } from "@/components/common/InlineAlert";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { WideModal } from "@/components/common/WideModal";
import { FieldGrid, Form } from "@/components/forms/Form";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useLanguage, useT } from "@/i18n/useT";
import { grantsFromRole, grantsToBody, roleName, sameGrants, type GrantMap } from "@/lib/permissionCatalog";
import { orderRoles } from "@/lib/rolePermissions";
import { FieldVisibility, PermissionMatrix } from "./PermissionMatrix";

/** Example names for the per-language name fields (sample values, the same in every UI language). */
const NAME_EXAMPLE = { en: "Site PM", roman: "Site PM", urdu: "سائٹ پی ایم" };
const FORM_ID = "role-form";
const EMPTY = "__empty__";
const BASE_ROLES: RoleBaseRole[] = ["PM", "MUNSHI", "OTHER"];

export type RoleTab = "details" | "permissions";

function roleSchema(t: ReturnType<typeof useT>) {
  const optional = z.string().trim().max(60);
  return z.object({
    name: z.string().trim().min(2, t("roles.nameRequired")).max(60, t("roles.nameRequired")),
    nameRoman: optional,
    nameUrdu: optional,
    description: z.string().trim().max(300),
    baseRole: z.enum(["PM", "MUNSHI", "OTHER"]),
    fromRoleId: z.string(),
  });
}
type Values = z.input<ReturnType<typeof roleSchema>>;
type Output = z.output<ReturnType<typeof roleSchema>>;

function RoleForm({
  role,
  catalog,
  roles,
  initialTab,
  onClose,
  onOpenRole,
}: {
  /** null = a new role. */
  role: PermissionRole | null;
  catalog: PermissionCatalog;
  roles: PermissionRole[];
  initialTab: RoleTab;
  onClose: () => void;
  onOpenRole: (id: string, tab?: RoleTab) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const appReadOnly = useReadOnly();
  const schema = useMemo(() => roleSchema(t), [t]);
  const [create, { isLoading: creating }] = useCreateRoleMutation();
  const [update, { isLoading: updating }] = useUpdateRoleMutation();
  const [setPermissions, { isLoading: savingPermissions }] = useSetRolePermissionsMutation();
  const [duplicate, { isLoading: duplicating }] = useDuplicateRoleMutation();
  const run = useMutationToast();
  const [tab, setTab] = useState<RoleTab>(initialTab);
  const locked = Boolean(role?.isSystem) || appReadOnly;
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role?.name ?? "",
      nameRoman: role?.nameRoman ?? "",
      nameUrdu: role?.nameUrdu ?? "",
      description: role?.description ?? "",
      baseRole: role?.baseRole ?? "PM",
      fromRoleId: EMPTY,
    },
  });
  const base = useMemo(() => (role ? grantsFromRole(role) : {}), [role]);
  const [draft, setDraft] = useState<GrantMap | null>(null);
  const grants = draft ?? base;
  // New role "start from": copy that role's permissions (and account type) into the editor.
  useEffect(() => {
    if (role) return;
    return form.subscribe({
      name: "fromRoleId",
      formState: { values: true },
      callback: ({ values }) => {
        const source = roles.find((r) => r.id === values.fromRoleId);
        setDraft(source ? grantsFromRole(source) : {});
        if (source) form.setValue("baseRole", source.baseRole);
      },
    });
  }, [form, role, roles]);
  const busy = creating || updating || savingPermissions || duplicating;
  // Read during render so react-hook-form tracks it (formState is a subscription proxy).
  const detailsDirty = form.formState.isDirty;
  const hasErrors = Object.keys(form.formState.errors).length > 0;
  const name = role ? roleName(role, language) : "";

  const onSubmit = async (v: Output) => {
    const options = {
      setError: form.setError,
      codeFields: { ROLE_NAME_TAKEN: "name", ROLE_IN_USE: "baseRole" },
    };
    const permissions = grantsToBody(grants, catalog);
    if (!role) {
      const created = await run(
        () =>
          create({
            name: v.name,
            nameRoman: v.nameRoman || undefined,
            nameUrdu: v.nameUrdu || undefined,
            description: v.description || undefined,
            baseRole: v.baseRole,
            permissions,
          }).unwrap(),
        { ...options, success: (r) => t("roles.created", { name: roleName(r, language) }) },
      );
      if (created) onClose();
      else if (Object.keys(form.formState.errors).length) setTab("details");
      return;
    }
    if (detailsDirty) {
      const ok = await run(
        () =>
          update({
            id: role.id,
            body: {
              name: v.name,
              nameRoman: v.nameRoman || null,
              nameUrdu: v.nameUrdu || null,
              description: v.description || null,
              baseRole: v.baseRole,
            },
          }).unwrap(),
        options,
      );
      if (!ok) {
        setTab("details");
        return;
      }
    }
    if (!sameGrants(grants, base)) {
      const ok = await run(() => setPermissions({ id: role.id, body: { permissions } }).unwrap());
      if (!ok) return;
    }
    toast.success(t("roles.saved", { name: v.name }));
    onClose();
  };

  const copy = async () => {
    if (!role) return;
    const created = await run(() => duplicate({ id: role.id }).unwrap(), {
      success: (r) => t("roles.duplicated", { name: roleName(r, language) }),
    });
    if (created) onOpenRole(created.id, tab);
  };

  const held = Object.keys(grants).filter((k) =>
    catalog.permissions.some((p) => p.key === k && !p.ownerOnly),
  ).length;
  const sources = orderRoles(roles, catalog).map((r) => ({ value: r.id, label: roleName(r, language) }));

  return (
    <WideModal
      open
      onOpenChange={(o) => !o && onClose()}
      title={role ? name : t("roles.createTitle")}
      description={role ? t(`roles.baseRole.${role.baseRole}`) : t("roles.createDesc")}
      busy={busy}
      testId="role-modal"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="tabular text-sm text-muted-foreground">
            {t("roles.selectedCount", { n: held })}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {locked ? t("common.close") : t("common.cancel")}
            </Button>
            {role?.isSystem && !appReadOnly ? (
              <Button type="button" onClick={() => void copy()} disabled={busy}>
                <Copy data-icon="inline-start" />
                {t("roles.duplicateToEdit")}
              </Button>
            ) : null}
            {!locked ? (
              <Button type="submit" form={FORM_ID} disabled={busy}>
                {role ? t("common.save") : t("roles.create")}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <Form form={form} onSubmit={onSubmit} onInvalid={() => setTab("details")} id={FORM_ID}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as RoleTab)} className="gap-5">
          <FormTabsList
            tabs={[
              { value: "details", label: t("roles.tabDetails"), error: hasErrors },
              { value: "permissions", label: t("roles.tabPermissions") },
            ]}
          />
          <TabsContent value="details" forceMount className={TAB_CONTENT_CLASS}>
            {role?.isSystem ? (
              <InlineAlert
                tone="info"
                title={t("roles.systemTitle")}
                action={
                  !appReadOnly ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copy()}
                      disabled={busy}
                    >
                      <Copy data-icon="inline-start" />
                      {t("roles.duplicateToEdit")}
                    </Button>
                  ) : undefined
                }
              >
                {t("roles.systemBody")}
              </InlineAlert>
            ) : null}
            <TextField
              name="name"
              label={t("roles.nameEn")}
              required
              maxLength={60}
              dir="ltr"
              placeholder={NAME_EXAMPLE.en}
              disabled={locked}
            />
            <FieldGrid>
              <TextField
                name="nameRoman"
                label={t("roles.nameRoman")}
                maxLength={60}
                dir="ltr"
                placeholder={NAME_EXAMPLE.roman}
                disabled={locked}
              />
              <TextField
                name="nameUrdu"
                label={t("roles.nameUrdu")}
                maxLength={60}
                dir="rtl"
                placeholder={NAME_EXAMPLE.urdu}
                disabled={locked}
              />
            </FieldGrid>
            {/* Template descriptions come from the server in English only. */}
            {!role?.isSystem || language === "en" ? (
              <TextareaField
                name="description"
                label={t("roles.descriptionLabel")}
                maxLength={300}
                rows={2}
                disabled={locked}
              />
            ) : null}
            <FieldGrid>
              <SelectField
                name="baseRole"
                label={t("roles.baseRoleLabel")}
                required
                disabled={locked}
                options={BASE_ROLES.map((b) => ({ value: b, label: t(`roles.baseRole.${b}`) }))}
              />
              {!role ? (
                <SelectField
                  name="fromRoleId"
                  label={t("roles.startFrom")}
                  options={[{ value: EMPTY, label: t("roles.startEmpty") }, ...sources]}
                />
              ) : null}
            </FieldGrid>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setTab("permissions")}>
                {t("roles.nextPermissions")}
                <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="permissions" forceMount className={TAB_CONTENT_CLASS}>
            <p className="text-sm text-muted-foreground">{t("roles.matrixDesc")}</p>
            <PermissionMatrix catalog={catalog} value={grants} onChange={setDraft} readOnly={locked} />
            <section className="space-y-3 rounded-2xl border p-4" data-module="fields">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold">{t("roles.fieldsTitle")}</h4>
                <p className="text-xs text-muted-foreground">{t("roles.fieldsDesc")}</p>
              </div>
              <FieldVisibility catalog={catalog} value={grants} onChange={setDraft} readOnly={locked} />
            </section>
          </TabsContent>
        </Tabs>
      </Form>
    </WideModal>
  );
}

/**
 * Role create / edit: a centered modal with Details | Permissions tabs. `roleId` null + open =
 * a new role. System templates are read-only (Duplicate to edit).
 */
export function RoleModal({
  open,
  roleId,
  initialTab = "details",
  onClose,
  onOpenRole,
}: {
  open: boolean;
  roleId: string | null;
  initialTab?: RoleTab;
  onClose: () => void;
  onOpenRole: (id: string, tab?: RoleTab) => void;
}) {
  const t = useT();
  const role = useGetRoleQuery(roleId ?? "", { skip: !open || !roleId });
  const catalog = useGetPermissionCatalogQuery(undefined, { skip: !open });
  const roles = useGetRolesQuery(undefined, { skip: !open });
  if (!open) return null;
  const error = role.error ?? catalog.error ?? roles.error;
  const ready = catalog.data && roles.data && (!roleId || role.data);
  if (!error && ready) {
    return (
      <RoleForm
        // A saved / other role re-mounts the form with the server state.
        key={roleId ? `${roleId}:${role.data!.updatedAt}` : "new"}
        role={roleId ? role.data! : null}
        catalog={catalog.data!}
        roles={roles.data!}
        initialTab={initialTab}
        onClose={onClose}
        onOpenRole={onOpenRole}
      />
    );
  }
  return (
    <WideModal open onOpenChange={(o) => !o && onClose()} title={t("roles.title")} testId="role-modal">
      {error ? (
        <ErrorState error={error} onRetry={() => void catalog.refetch()} compact />
      ) : (
        <CardsSkeleton count={3} height="h-24" />
      )}
    </WideModal>
  );
}
