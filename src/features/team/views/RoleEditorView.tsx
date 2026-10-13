"use client";

import { Copy, Save, Type, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  useDuplicateRoleMutation,
  useGetPermissionCatalogQuery,
  useGetRoleQuery,
  useSetRolePermissionsMutation,
} from "@/api/services/permissions.api";
import type { PermissionCatalog, PermissionRole } from "@/api/types";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useLanguage, useT } from "@/i18n/useT";
import { grantsFromRole, grantsToBody, roleName, sameGrants, type GrantMap } from "@/lib/permissionCatalog";
import { FieldVisibility, PermissionMatrix } from "../components/PermissionMatrix";
import { RoleSlideOver } from "../components/RoleSlideOver";
import { RoleTypeBadge } from "./RolesView";

function RoleEditor({ role, catalog }: { role: PermissionRole; catalog: PermissionCatalog }) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const appReadOnly = useReadOnly();
  const [setPermissions, { isLoading: saving }] = useSetRolePermissionsMutation();
  const [duplicate, { isLoading: duplicating }] = useDuplicateRoleMutation();
  const [renaming, setRenaming] = useState(false);
  const run = useMutationToast();
  const base = useMemo(() => grantsFromRole(role), [role]);
  const [draft, setDraft] = useState<GrantMap | null>(null);
  const grants = draft ?? base;
  const dirty = draft !== null && !sameGrants(draft, base);
  const locked = role.isSystem || appReadOnly;
  const name = roleName(role, language);

  const save = async () => {
    const saved = await run(
      () => setPermissions({ id: role.id, body: { permissions: grantsToBody(grants, catalog) } }).unwrap(),
      {
        success: t("roles.saved", { name }),
      },
    );
    if (saved) setDraft(null);
  };
  const copy = async () => {
    const created = await run(() => duplicate({ id: role.id }).unwrap(), {
      success: (r) => t("roles.duplicated", { name: roleName(r, language) }),
    });
    if (created) router.push(`/team/roles/${created.id}`);
  };
  const held = Object.keys(grants).length;

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={<bdi>{name}</bdi>}
        meta={<RoleTypeBadge role={role} />}
        // Template descriptions come from the server in English only.
        description={
          role.description && (!role.isSystem || language === "en")
            ? role.description
            : t(`roles.baseRole.${role.baseRole}`)
        }
        breadcrumbs={[
          { label: t("roles.team") },
          { label: t("roles.title"), href: "/team/roles" },
          { label: name },
        ]}
        actions={
          !appReadOnly ? (
            <>
              {!role.isSystem ? (
                <Button variant="outline" onClick={() => setRenaming(true)}>
                  <Type data-icon="inline-start" />
                  {t("roles.rename")}
                </Button>
              ) : null}
              <Button
                variant={role.isSystem ? "default" : "outline"}
                onClick={() => void copy()}
                disabled={duplicating}
              >
                <Copy data-icon="inline-start" />
                {role.isSystem ? t("roles.duplicateToEdit") : t("roles.duplicate")}
              </Button>
            </>
          ) : null
        }
      />
      {role.isSystem ? (
        <InlineAlert tone="info" title={t("roles.systemTitle")}>
          {t("roles.systemBody")}
        </InlineAlert>
      ) : null}
      <SectionCard
        flush
        title={t("roles.matrixTitle")}
        description={t("roles.matrixDesc")}
        actions={
          <span className="tabular text-sm text-muted-foreground">
            {t("roles.selectedCount", { n: held })}
          </span>
        }
      >
        <PermissionMatrix catalog={catalog} value={grants} onChange={setDraft} readOnly={locked} />
      </SectionCard>
      <SectionCard title={t("roles.fieldsTitle")} description={t("roles.fieldsDesc")}>
        <FieldVisibility catalog={catalog} value={grants} onChange={setDraft} readOnly={locked} />
      </SectionCard>
      {dirty && !locked ? (
        <div
          className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-card"
          role="region"
          aria-label={t("roles.unsaved")}
        >
          <span className="text-sm font-medium">{t("roles.unsaved")}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              <Undo2 data-icon="inline-start" />
              {t("roles.discard")}
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              <Save data-icon="inline-start" />
              {t("roles.save")}
            </Button>
          </div>
        </div>
      ) : null}
      <RoleSlideOver open={renaming} role={renaming ? role : null} onOpenChange={setRenaming} />
    </div>
  );
}

/** Team → Roles & Permissions → one role: the module × action matrix and data visibility. */
export function RoleEditorView({ roleId }: { roleId: string }) {
  const role = useGetRoleQuery(roleId);
  const catalog = useGetPermissionCatalogQuery();
  if (role.error || catalog.error) {
    return (
      <SectionCard>
        <ErrorState
          error={role.error ?? catalog.error}
          onRetry={() => (role.error ? role.refetch() : catalog.refetch())}
        />
      </SectionCard>
    );
  }
  if (!role.data || !catalog.data) return <CardsSkeleton count={3} height="h-40" />;
  // Re-mount on every server version so a saved role resets the draft.
  return (
    <RoleEditor key={`${role.data.id}:${role.data.updatedAt}`} role={role.data} catalog={catalog.data} />
  );
}
