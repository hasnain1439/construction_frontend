"use client";

import { DemoBadge } from "@/features/onboarding/components/DemoBadge";
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
import { useEnumT, useStatusT, useT, type TranslationKey } from "@/i18n/useT";
import { ProjectCard } from "../components/ProjectCard";
import { CONTRACT_TYPE_VALUES } from "../constants";
import { projectLanding } from "../utils/links";

type View = "cards" | "table";

/**
 * Shared list for All Projects and Closed & Archived: cards/table toggle, search, status,
 * contract type and PM filters, server pagination.
 */
export function ProjectsBrowser({
  titleKey,
  statuses,
  defaultStatus = "",
  allowAllStatuses = true,
}: {
  titleKey: TranslationKey;
  statuses: ProjectStatus[];
  defaultStatus?: ProjectStatus | "";
  allowAllStatuses?: boolean;
}) {
  const t = useT();
  const te = useEnumT();
  const ts = useStatusT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreate = useCan("projects.project.create");
  // The PM filter needs the member list.
  const isOffice = useCan({ anyPermission: ["team.member.view", "team.member.manage"] });
  const showMoney = useCan("fields.contract");
  const initialStatus = (searchParams.get("status") as ProjectStatus | null) ?? defaultStatus;
  const list = useListState({ status: statuses.includes(initialStatus as ProjectStatus) ? initialStatus : defaultStatus, contractType: "", pmId: "" }, 24);
  const [view, setView] = useState<View>("cards");
  const pms = useGetUsersQuery({ role: "PM", status: "ACTIVE", limit: 100 }, { skip: !isOffice });
  const query = { ...list.query, ...(list.filters.status ? {} : allowAllStatuses ? {} : { status: defaultStatus }) } as ProjectsQuery;
  const { data, isLoading, isFetching, error, refetch } = useGetProjectsQuery(query);

  const statusOptions: FilterOption[] = statuses.map((s) => ({ value: s, label: ts("project", s) }));
  const pmOptions: FilterOption[] = (pms.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }));

  const columns: Column<ProjectListItem>[] = [
    {
      id: "name",
      header: t("field.project"),
      sortValue: (p) => p.name,
      cell: (p) => (
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {p.name}
            <DemoBadge isDemo={p.isDemo} />
          </p>
          <p className="text-xs text-muted-foreground">{p.code}</p>
        </div>
      ),
    },
    { id: "client", header: t("field.client"), cell: (p) => p.client?.name ?? "—", sortValue: (p) => p.client?.name ?? "" },
    { id: "city", header: t("field.city"), cell: (p) => p.city ?? "—" },
    { id: "type", header: t("field.contract"), cell: (p) => (p.contractType ? te("projectContractType", p.contractType) : "—") },
    { id: "value", header: t("field.value"), align: "right", hidden: !showMoney, cell: (p) => <MoneyText paisa={p.contractValuePaisa} short /> },
    { id: "pm", header: t("projects.list.pm"), cell: (p) => p.pm?.name ?? <span className="text-muted-foreground">—</span> },
    { id: "end", header: t("projects.list.endDate"), cell: (p) => formatDate(p.endDate), sortValue: (p) => p.endDate ?? "" },
    { id: "status", header: t("field.status"), cell: (p) => <StatusBadge domain="project" value={p.status} />, sortValue: (p) => p.status },
  ];

  const pagination = data
    ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize }
    : undefined;

  return (
    <>
      <PageHeader
        title={t(titleKey)}
        breadcrumbs={[{ label: t("crumb.projects"), href: "/projects" }, { label: t(titleKey) }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/projects/new">
                <Plus data-icon="inline-start" />
                {t("projects.list.newProject")}
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
            ariaLabel={t("projects.list.view")}
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: "cards", label: t("projects.list.cards"), icon: LayoutGrid, iconOnly: true },
              { value: "table", label: t("projects.list.table"), icon: List, iconOnly: true },
            ]}
          />
        }
      >
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("projects.list.searchPlaceholder")} />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v as ProjectStatus | "")}
          options={statusOptions}
          allLabel={allowAllStatuses ? undefined : ts("project", defaultStatus)}
        />
        <FilterSelect
          label={t("field.contract")}
          value={list.filters.contractType}
          onChange={(v) => list.setFilter("contractType", v)}
          options={CONTRACT_TYPE_VALUES.map((value) => ({ value, label: te("projectContractType", value) }))}
        />
        {isOffice ? <FilterSelect label={t("projects.list.pm")} value={list.filters.pmId} onChange={(v) => list.setFilter("pmId", v)} options={pmOptions} /> : null}
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
            empty={{ title: t("projects.list.noProjectsFound"), description: t("projects.list.tryAnotherFilter"), icon: FolderKanban }}
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
            title={list.isFiltered ? t("projects.list.noProjectsMatch") : t("projects.list.noProjectsYet")}
            description={list.isFiltered ? t("projects.list.tryAnotherFilter") : t("projects.list.createFirst")}
            action={
              canCreate && !list.isFiltered ? (
                <Button asChild>
                  <Link href="/projects/new">{t("projects.list.newProject")}</Link>
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
