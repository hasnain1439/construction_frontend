"use client";

import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useGetUsersQuery } from "@/api/services/team.api";
import type { TeamUser, UsersQuery } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { HiddenForRole } from "@/components/common/HiddenForRole";
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
import { formatRelative } from "@/lib/dates";
import { ROLE_LABEL } from "@/lib/options";
import { formatPhone } from "@/lib/phone";
import { EditMemberSlideOver } from "../components/EditMemberSlideOver";
import { InviteMemberSlideOver } from "../components/InviteMemberSlideOver";
import { ProjectChips, RoleBadge } from "../components/TeamBits";

export function MembersView() {
  const canManage = useCan({ permission: "users.manage" });
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
      header: "Name",
      cell: (u) => <AvatarName name={u.name} subtitle={u.email ?? undefined} />,
      sortValue: (u) => u.name,
    },
    { id: "phone", header: "Phone", cell: (u) => <span className="tabular">{formatPhone(u.phone)}</span> },
    { id: "role", header: "Role", cell: (u) => <RoleBadge role={u.role} />, sortValue: (u) => u.role },
    { id: "projects", header: "Projects", cell: (u) => <ProjectChips projects={u.projects} all={u.allProjects} /> },
    {
      id: "financials",
      header: "Sees financials",
      cell: (u) =>
        u.role !== "PM" ? (
          <span className="text-muted-foreground">—</span>
        ) : u.canSeeFinancials === undefined ? (
          <HiddenForRole compact />
        ) : u.canSeeFinancials ? (
          "Yes"
        ) : (
          "No"
        ),
    },
    { id: "status", header: "Status", cell: (u) => <StatusBadge domain="user" value={u.status} />, sortValue: (u) => u.status },
    {
      id: "lastActive",
      header: "Last active",
      cell: (u) => <span className="text-muted-foreground">{formatRelative(u.lastActiveAt, "Never")}</span>,
      sortValue: (u) => u.lastActiveAt ?? "",
    },
  ];

  return (
    <>
      <PageHeader
        title="Members"
        breadcrumbs={[{ label: "Team" }, { label: "Members" }]}
        actions={
          canManage && !readOnly ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus data-icon="inline-start" />
              Invite member
            </Button>
          ) : null
        }
      />
      {usage ? (
        <SectionCard>
          <UsageBar
            label="Office users"
            used={usage.officeUsers}
            limit={usage.maxOfficeUsers}
            hint={`${usage.officeUsers} of ${usage.maxOfficeUsers ?? "unlimited"} office users (Munshis don't count; pending PM invites hold a seat).`}
          />
        </SectionCard>
      ) : null}
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name or phone…" />
        <FilterSelect
          label="Role"
          value={list.filters.role}
          onChange={(v) => list.setFilter("role", v)}
          options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
        <div className="w-60">
          <Combobox
            value={list.filters.projectId || null}
            onChange={(v) => list.setFilter("projectId", (v as string | null) ?? "")}
            options={projectOptions}
            placeholder="Project: All"
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
          empty={{ title: "No members found", description: "Try another filter, or invite your PMs and Munshis.", icon: Users }}
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
          <InviteMemberSlideOver open={inviteOpen} onOpenChange={setInviteOpen} />
          <EditMemberSlideOver userId={editing} onClose={() => setEditing(null)} />
        </>
      ) : null}
    </>
  );
}
