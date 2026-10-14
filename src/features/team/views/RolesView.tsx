"use client";

import { Copy, Eye, Lock, Pencil, Plus, ShieldCheck, SlidersHorizontal, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDuplicateRoleMutation, useGetRolesQuery } from "@/api/services/permissions.api";
import type { PermissionRole } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useLanguage, useT } from "@/i18n/useT";
import { roleName } from "@/lib/permissionCatalog";
import { RoleModal, type RoleTab } from "../components/RoleModal";

/** Other-language names under the main one ("Project Manager · پراجیکٹ مینیجر"). */
function otherNames(role: PermissionRole, shown: string): string[] {
  return [role.name, role.nameRoman, role.nameUrdu]
    .filter((n): n is string => Boolean(n) && n !== shown)
    .filter((n, i, all) => all.indexOf(n) === i);
}

/** Role templates badge: Template (system, read-only) or Custom. */
export function RoleTypeBadge({ role }: { role: Pick<PermissionRole, "isSystem"> }) {
  const t = useT();
  return role.isSystem ? (
    <StatusBadge tone="info" icon={Lock} label={t("roles.system")} />
  ) : (
    <StatusBadge tone="success" icon={SlidersHorizontal} label={t("roles.custom")} />
  );
}

/**
 * Team → Roles & Permissions: every role template of the company. Edit / Rename / New role open the
 * role modal (Details | Permissions); /team/roles/:id opens it for that role.
 */
export function RolesView({ initialRoleId }: { initialRoleId?: string } = {}) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const readOnly = useReadOnly();
  const { data, isLoading, isFetching, error, refetch } = useGetRolesQuery();
  const [duplicate, { isLoading: duplicating }] = useDuplicateRoleMutation();
  const [modal, setModal] = useState<{ roleId: string | null; tab: RoleTab } | null>(
    initialRoleId ? { roleId: initialRoleId, tab: "permissions" } : null,
  );
  const run = useMutationToast();

  const open = (role: PermissionRole) => setModal({ roleId: role.id, tab: "permissions" });
  const close = () => {
    setModal(null);
    if (initialRoleId) router.replace("/team/roles");
  };
  const copy = async (role: PermissionRole) => {
    const created = await run(() => duplicate({ id: role.id }).unwrap(), {
      success: (r) => t("roles.duplicated", { name: roleName(r, language) }),
    });
    if (created) setModal({ roleId: created.id, tab: "details" });
  };

  const columns: Column<PermissionRole>[] = [
    {
      id: "name",
      header: t("roles.colRole"),
      sortValue: (role) => roleName(role, language),
      cell: (role) => {
        const name = roleName(role, language);
        const others = otherNames(role, name);
        return (
          <div className="min-w-0">
            <p className="font-medium">
              <bdi>{name}</bdi>
            </p>
            {others.length ? (
              <p className="text-xs text-muted-foreground">
                {others.map((n, i) => (
                  <span key={n}>
                    {i ? " · " : null}
                    <bdi>{n}</bdi>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "type",
      header: t("roles.colType"),
      sortValue: (role) => (role.isSystem ? 0 : 1),
      cell: (role) => <RoleTypeBadge role={role} />,
    },
    {
      id: "for",
      header: t("roles.colFor"),
      cell: (role) => <span className="text-sm">{t(`roles.baseRole.${role.baseRole}`)}</span>,
    },
    {
      id: "members",
      header: t("roles.colMembers"),
      align: "right",
      sortValue: (role) => role.userCount,
      cell: (role) => <span className="tabular">{role.userCount}</span>,
    },
    {
      id: "permissions",
      header: t("roles.colPermissions"),
      align: "right",
      sortValue: (role) => role.permissions.length,
      cell: (role) => (
        <span className="tabular text-muted-foreground">
          {t("roles.permissionsCount", { n: role.permissions.length })}
        </span>
      ),
    },
    {
      ...ACTIONS_COLUMN,
      header: <span className="sr-only">{t("common.actions")}</span>,
      cell: (role) => (
        <RowActions
          name={roleName(role, language)}
          actions={[
            {
              label: role.isSystem || readOnly ? t("roles.viewPermissions") : t("roles.editPermissions"),
              icon: role.isSystem || readOnly ? Eye : Pencil,
              onSelect: () => open(role),
            },
            {
              label: t("roles.duplicate"),
              icon: Copy,
              hidden: readOnly,
              disabled: duplicating,
              onSelect: () => void copy(role),
            },
            {
              label: t("roles.rename"),
              icon: Type,
              hidden: readOnly || role.isSystem,
              onSelect: () => setModal({ roleId: role.id, tab: "details" }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("roles.title")}
        description={t("roles.description")}
        breadcrumbs={[{ label: t("roles.team") }, { label: t("roles.title") }]}
        actions={
          !readOnly ? (
            <Button onClick={() => setModal({ roleId: null, tab: "details" })}>
              <Plus data-icon="inline-start" />
              {t("roles.newRole")}
            </Button>
          ) : null
        }
      />
      <InlineAlert tone="info" title={t("role.THEKEDAR")}>
        {t("roles.ownerNote")}
      </InlineAlert>
      <SectionCard flush>
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(role) => role.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={open}
          clientPageSize={25}
          empty={{ title: t("roles.emptyTitle"), description: t("roles.emptyDesc"), icon: ShieldCheck }}
        />
      </SectionCard>
      <RoleModal
        open={modal !== null}
        roleId={modal?.roleId ?? null}
        initialTab={modal?.tab}
        onClose={close}
        onOpenRole={(roleId, tab) => setModal({ roleId, tab: tab ?? "details" })}
      />
    </>
  );
}
