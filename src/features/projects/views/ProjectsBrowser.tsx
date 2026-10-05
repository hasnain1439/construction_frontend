"use client";

import { FolderKanban, LayoutGrid, List, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import type { ProjectListItem, ProjectsQuery, ProjectStatus } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect, type FilterOption } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { Pagination } from "@/components/common/Pagination";
import { useCan } from "@/components/common/PermissionGate";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { formatDate } from "@/lib/dates";
import { statusMeta } from "@/lib/status";
import { ProjectCard } from "../components/ProjectCard";
import { CONTRACT_TYPE_LABEL } from "../constants";
import { projectLanding } from "../utils/links";

type View = "cards" | "table";

/**
 * Shared list for All Projects and Closed & Archived: cards/table toggle, search, status,
 * contract type and PM filters, server pagination.
 */
export function ProjectsBrowser({
  title,
  crumb,
  statuses,
  defaultStatus = "",
  allowAllStatuses = true,
}: {
  title: string;
  crumb: string;
  statuses: ProjectStatus[];
  defaultStatus?: ProjectStatus | "";
  allowAllStatuses?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate = useCan({ permission: "projects.manage" });
  const isOffice = useCan({ roles: ["THEKEDAR", "PM"] });
  const showMoney = useCan({ permission: "billing.view" });
  const initialStatus = (searchParams.get("status") as ProjectStatus | null) ?? defaultStatus;
  const list = useListState({ status: statuses.includes(initialStatus as ProjectStatus) ? initialStatus : defaultStatus, contractType: "", pmId: "" }, 24);
  const [view, setView] = useState<View>("cards");
  const pms = useGetUsersQuery({ role: "PM", status: "ACTIVE", limit: 100 }, { skip: !isOffice });
  const query = { ...list.query, ...(list.filters.status ? {} : allowAllStatuses ? {} : { status: defaultStatus }) } as ProjectsQuery;
  const { data, isLoading, isFetching, error, refetch } = useGetProjectsQuery(query);

  const statusOptions: FilterOption[] = statuses.map((s) => ({ value: s, label: statusMeta("project", s).label }));
  const pmOptions: FilterOption[] = (pms.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }));

  const columns: Column<ProjectListItem>[] = [
    {
      id: "name",
      header: "Project",
      sortValue: (p) => p.name,
      cell: (p) => (
        <div className="min-w-0">
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.code}</p>
        </div>
      ),
    },
    { id: "client", header: "Client", cell: (p) => p.client?.name ?? "—", sortValue: (p) => p.client?.name ?? "" },
    { id: "city", header: "City", cell: (p) => p.city ?? "—" },
    { id: "type", header: "Contract", cell: (p) => (p.contractType ? CONTRACT_TYPE_LABEL[p.contractType] : "—") },
    { id: "value", header: "Value", align: "right", hidden: !showMoney, cell: (p) => <MoneyText paisa={p.contractValuePaisa} short /> },
    { id: "pm", header: "PM", cell: (p) => p.pm?.name ?? <span className="text-muted-foreground">—</span> },
    { id: "end", header: "End date", cell: (p) => formatDate(p.endDate), sortValue: (p) => p.endDate ?? "" },
    { id: "status", header: "Status", cell: (p) => <StatusBadge domain="project" value={p.status} />, sortValue: (p) => p.status },
  ];

  const pagination = data
    ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize }
    : undefined;

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: crumb }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/projects/new">
                <Plus data-icon="inline-start" />
                New project
              </Link>
            </Button>
          ) : null
        }
      />
      <FilterBar
        onClear={list.clear}
        canClear={list.isFiltered}
        trailing={
          <SegmentedControl<View>
            ariaLabel="View"
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: "cards", label: "Cards", icon: LayoutGrid, iconOnly: true },
              { value: "table", label: "Table", icon: List, iconOnly: true },
            ]}
          />
        }
      >
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name, code or client…" />
        <FilterSelect
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v as ProjectStatus | "")}
          options={statusOptions}
          allLabel={allowAllStatuses ? undefined : statusMeta("project", defaultStatus).label}
        />
        <FilterSelect
          label="Contract"
          value={list.filters.contractType}
          onChange={(v) => list.setFilter("contractType", v)}
          options={Object.entries(CONTRACT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
        />
        {isOffice ? <FilterSelect label="PM" value={list.filters.pmId} onChange={(v) => list.setFilter("pmId", v)} options={pmOptions} /> : null}
      </FilterBar>
      {view === "table" ? (
        <SectionCard flush>
          <DataTable
            rows={data?.items}
            columns={columns}
            getRowId={(p) => p.id}
            loading={isLoading || isFetching}
            error={error}
            onRetry={refetch}
            onRowClick={(p) => router.push(projectLanding(p))}
            empty={{ title: "No projects found", description: "Try another filter.", icon: FolderKanban }}
            pagination={pagination}
          />
        </SectionCard>
      ) : isLoading ? (
        <CardsSkeleton count={6} height="h-56" />
      ) : error && !data ? (
        <SectionCard>
          <ErrorState error={error} onRetry={refetch} />
        </SectionCard>
      ) : !data?.items.length ? (
        <SectionCard>
          <EmptyState
            icon={FolderKanban}
            title={list.isFiltered ? "No projects match" : "No projects yet"}
            description={list.isFiltered ? "Try another filter." : "Create your first project with the 6-step setup."}
            action={
              canCreate && !list.isFiltered ? (
                <Button asChild>
                  <Link href="/projects/new">New project</Link>
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <div className="space-y-4" aria-busy={isFetching || undefined}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((p) => (
              <ProjectCard key={p.id} project={p} showMoney={showMoney} />
            ))}
          </div>
          {pagination && data.meta.total > list.pageSize ? (
            <div className="rounded-xl border bg-card">
              <Pagination {...pagination} pageSizeOptions={[12, 24, 48, 96]} />
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
