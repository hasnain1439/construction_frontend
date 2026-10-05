"use client";

import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetAdminPlansQuery } from "@/api/services/admin/plans.api";
import { useGetTenantsQuery } from "@/api/services/admin/tenants.api";
import type { TenantRow, TenantsQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListState } from "@/hooks/useListState";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { formatDate } from "@/lib/dates";
import { REGION_LABEL } from "@/lib/options";
import { formatPhone } from "@/lib/phone";
import { CreateCompanySlideOver } from "../components/CreateCompanySlideOver";

const usage = (u: { used: number; limit: number | null }) => `${u.used} / ${u.limit ?? "∞"}`;

export function CompaniesView() {
  const router = useRouter();
  const list = useListState({ tenantStatus: "", subscriptionStatus: "", plan: "", renewsBefore: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetTenantsQuery(list.query as TenantsQuery);
  const plans = useGetAdminPlansQuery();
  const [createOpen, setCreateOpen] = useSearchFlag();

  const columns: Column<TenantRow>[] = [
    {
      id: "company",
      header: "Company",
      sortValue: (t) => t.name,
      cell: (t) => (
        <div>
          <p className="font-medium">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.slug}</p>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Owner",
      cell: (t) =>
        t.owner ? (
          <div>
            <p>{t.owner.name}</p>
            <p className="text-xs text-muted-foreground tabular">{formatPhone(t.owner.phone)}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">Invite pending</span>
        ),
    },
    { id: "region", header: "Region", cell: (t) => REGION_LABEL[t.region] ?? t.region },
    { id: "plan", header: "Plan", cell: (t) => t.plan?.name ?? "—", sortValue: (t) => t.plan?.code ?? "" },
    {
      id: "status",
      header: "Status",
      cell: (t) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge domain="tenant" value={t.tenantStatus} />
          {t.subscriptionStatus && t.subscriptionStatus !== "ACTIVE" ? <StatusBadge domain="subscription" value={t.subscriptionStatus} /> : null}
        </div>
      ),
    },
    { id: "projects", header: "Projects", align: "right", cell: (t) => <span className="tabular">{usage(t.usage.activeProjects)}</span> },
    { id: "users", header: "Users", align: "right", cell: (t) => <span className="tabular">{usage(t.usage.officeUsers)}</span> },
    { id: "renewal", header: "Renewal", cell: (t) => formatDate(t.renewsOn), sortValue: (t) => t.renewsOn ?? "" },
  ];

  return (
    <>
      <PageHeader
        title="Companies"
        breadcrumbs={[{ label: "Companies" }]}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Create company
          </Button>
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Name, slug or owner phone…" />
        <FilterSelect
          label="Status"
          value={list.filters.tenantStatus}
          onChange={(v) => list.setFilter("tenantStatus", v)}
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "READ_ONLY", label: "Read-only" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "CLOSED", label: "Closed" },
          ]}
        />
        <FilterSelect
          label="Subscription"
          value={list.filters.subscriptionStatus}
          onChange={(v) => list.setFilter("subscriptionStatus", v)}
          options={[
            { value: "TRIAL", label: "Trial" },
            { value: "ACTIVE", label: "Active" },
            { value: "GRACE", label: "Grace" },
            { value: "LAPSED", label: "Lapsed" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <FilterSelect label="Plan" value={list.filters.plan} onChange={(v) => list.setFilter("plan", v)} options={(plans.data ?? []).map((p) => ({ value: p.code, label: p.name }))} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Renewing before
          <Input type="date" className="w-40" value={list.filters.renewsBefore} onChange={(e) => list.setFilter("renewsBefore", e.target.value)} />
        </label>
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(t) => t.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(t) => router.push(`/admin/companies/${t.id}`)}
          empty={{ title: "No companies found", icon: Building2 }}
          pagination={
            data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined
          }
        />
      </SectionCard>
      <CreateCompanySlideOver open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
