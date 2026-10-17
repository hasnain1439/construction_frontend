"use client";

import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useGetRolesQuery } from "@/api/services/permissions.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import type { TeamUser, UsersQuery } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { useCan } from "@/components/common/PermissionGate";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UsageBar } from "@/components/common/UsageBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Combobox } from "@/components/forms/ComboboxField";
import { Button } from "@/components/ui/button";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { useLanguage, useStatusT, useT } from "@/i18n/useT";
import { formatRelative } from "@/lib/dates";
import { roleName } from "@/lib/permissionCatalog";
import { formatPhone } from "@/lib/phone";
import { EditMemberModal, InviteMemberModal } from "../components/MemberModal";
import { ProjectChips, RoleBadge } from "../components/TeamBits";

export function MembersView() {
  const canManage = useCan("team.member.manage");
  const t = useT();
  const ts = useStatusT();
  const language = useLanguage();
  // Role names in the UI language (the list itself only carries the English name).
  const roles = useGetRolesQuery(undefined, { skip: !canManage });
  const roleById = new Map((roles.data ?? []).map((r) => [r.id, r]));
  const readOnly = useReadOnly();
  const list = useListState({ role: "", status: "", projectId: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetUsersQuery(list.query as UsersQuery); // empty filters are dropped by cleanParams
  const { options: projectOptions } = useProjectOptions();
  const [inviteOpen, setInviteOpen] = useSearchFlag();
  const [editing, setEditing] = useState<string | null>(null);
  const usage = data?.meta.usage;

  const columns: Column<TeamUser>[] = [
    {
      id: "name",
      header: t("field.name"),
      cell: (u) => <AvatarName name={u.name} subtitle={u.email ?? undefined} />,
      sortValue: (u) => u.name,
    },
    { id: "phone", header: t("field.phone"), cell: (u) => <bdi dir="ltr" className="tabular">{formatPhone(u.phone)}</bdi> },
    {
      id: "permissionRole",
      header: t("roles.inviteRole"),
      cell: (u) =>
        u.role === "THEKEDAR" ? (
          <span className="text-sm text-muted-foreground">{t("roles.allPermissions")}</span>
        ) : u.permissionRole ? (
          <bdi className="text-sm">{roleById.has(u.permissionRole.id) ? roleName(roleById.get(u.permissionRole.id)!, language) : u.permissionRole.name}</bdi>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    // The account type (PM for every office role) — not the role people are given (QA-C-15).
    { id: "role", header: t("roles.accountType"), cell: (u) => <RoleBadge role={u.role} />, sortValue: (u) => u.role },
    { id: "projects", header: t("field.projects"), cell: (u) => <ProjectChips projects={u.projects} all={u.allProjects} /> },
    { id: "status", header: t("field.status"), cell: (u) => <StatusBadge domain="user" value={u.status} />, sortValue: (u) => u.status },
    {
      id: "lastActive",
      header: t("teamCompany.edit.lastActive"),
      cell: (u) => <span className="text-muted-foreground">{formatRelative(u.lastActiveAt, t("teamCompany.edit.never"))}</span>,
      sortValue: (u) => u.lastActiveAt ?? "",
    },
  ];

  return (
    <>
      <PageHeader
        title={t("teamCompany.members.title")}
        breadcrumbs={[{ label: t("crumb.team") }, { label: t("teamCompany.members.title") }]}
        actions={
          canManage && !readOnly ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus data-icon="inline-start" />
              {t("teamCompany.invite.title")}
            </Button>
          ) : null
        }
      />
      {usage ? (
        <SectionCard>
          <UsageBar
            label={t("teamCompany.members.officeUsers")}
            used={usage.officeUsers}
            limit={usage.maxOfficeUsers}
            hint={t("teamCompany.members.usageHint", { used: usage.officeUsers, limit: usage.maxOfficeUsers ?? t("teamCompany.plan.unlimited") })}
          />
        </SectionCard>
      ) : null}
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("teamCompany.members.search")} />
        <FilterSelect
          label={t("field.role")}
          value={list.filters.role}
          onChange={(v) => list.setFilter("role", v)}
          options={(["THEKEDAR", "PM", "MUNSHI"] as const).map((value) => ({ value, label: t(`role.${value}`) }))}
        />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "ACTIVE", label: ts("user", "ACTIVE") },
            { value: "INACTIVE", label: ts("user", "INACTIVE") },
          ]}
        />
        <div className="w-60">
          <Combobox
            value={list.filters.projectId || null}
            onChange={(v) => list.setFilter("projectId", (v as string | null) ?? "")}
            options={projectOptions}
            placeholder={t("teamCompany.members.projectAll")}
          />
        </div>
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(u) => u.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={canManage ? (u) => setEditing(u.id) : undefined}
          empty={{ title: t("teamCompany.members.empty"), description: t("teamCompany.members.emptyDesc"), icon: Users }}
          pagination={
            data
              ? {
                  page: list.page,
                  pageSize: list.pageSize,
                  total: data.meta.total,
                  onPageChange: list.setPage,
                  onPageSizeChange: list.setPageSize,
                }
              : undefined
          }
        />
      </SectionCard>
      {canManage ? (
        <>
          <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} />
          <EditMemberModal userId={editing} onClose={() => setEditing(null)} />
        </>
      ) : null}
    </>
  );
}
