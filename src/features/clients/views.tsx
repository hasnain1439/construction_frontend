"use client";

import { ImportButton } from "@/features/onboarding/components/ImportWizard";
import { MessageCircle, Pencil, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetClientQuery, useGetClientsQuery } from "@/api/services/clients.api";
import type { Client, ClientDetail, ClientsQuery } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientStatements } from "@/features/billing/components/ClientStatements";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { BILLING_ACCESS } from "@/lib/navigation";
import { formatPhone } from "@/lib/phone";
import { ClientSlideOver } from "./ClientSlideOver";

export function ClientsView() {
  const t = useT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const canCreate = useCan("clients.client.create");
  const list = useListState({});
  const { data, isLoading, isFetching, error, refetch } = useGetClientsQuery(list.query as ClientsQuery);
  const [addOpen, setAddOpen] = useSearchFlag();

  const columns: Column<Client>[] = [
    { id: "name", header: t("field.name"), cell: (c) => <AvatarName name={c.name} subtitle={c.email ?? undefined} />, sortValue: (c) => c.name },
    { id: "phone", header: t("field.phone"), cell: (c) => <span className="tabular" dir="ltr">{formatPhone(c.phone)}</span> },
    { id: "address", header: t("field.address"), cell: (c) => <span className="line-clamp-1 text-muted-foreground">{c.address ?? "—"}</span> },
    { id: "projects", header: t("field.projects"), align: "right", cell: (c) => <span className="tabular">{c.projectsCount ?? 0}</span>, sortValue: (c) => c.projectsCount ?? 0 },
    { id: "added", header: t("masterData.common.colAdded"), cell: (c) => formatDate(c.createdAt), sortValue: (c) => c.createdAt },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.clients.title")}
        description={t("masterData.clients.description")}
        breadcrumbs={[{ label: t("crumb.sales") }, { label: t("masterData.clients.crumb") }]}
        actions={
          <>
            <ImportButton entity="clients" />
            {!readOnly && canCreate ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus data-icon="inline-start" />
                {t("masterData.clients.newClient")}
              </Button>
            ) : null}
          </>
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("masterData.clients.search")} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(c) => c.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(c) => router.push(`/sales/clients/${c.id}`)}
          empty={{ title: t("masterData.clients.emptyTitle"), description: t("masterData.clients.emptyDesc"), icon: UserRound }}
          pagination={
            data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined
          }
        />
      </SectionCard>
      <ClientSlideOver open={addOpen} client={null} onOpenChange={setAddOpen} onSaved={(c) => router.push(`/sales/clients/${c.id}`)} />
    </>
  );
}

function ClientDetailBody({ client }: { client: ClientDetail }) {
  const t = useT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const seesBilling = useCan(BILLING_ACCESS);
  const canEdit = useCan("clients.client.edit");
  const [editOpen, setEditOpen] = useState(false);
  return (
    <>
      <PageHeader
        title={client.name}
        breadcrumbs={[{ label: t("crumb.sales") }, { label: t("masterData.clients.crumb"), href: "/sales/clients" }, { label: client.name }]}
        actions={
          !readOnly && canEdit ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil data-icon="inline-start" />
              {t("common.edit")}
            </Button>
          ) : null
        }
      />
      <InlineAlert tone="info" title={t("masterData.clients.whatsappTitle")}>
        {t("masterData.clients.whatsappBody")}
      </InlineAlert>
      <SectionCard title={t("masterData.clients.contact")}>
        <InfoList
          columns={3}
          items={[
            {
              label: t("field.phone"),
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="size-4 text-success" aria-hidden />
                  <bdi dir="ltr">{formatPhone(client.phone)}</bdi>
                </span>
              ),
            },
            { label: t("field.email"), value: client.email },
            { label: t("masterData.clients.clientSince"), value: formatDate(client.createdAt) },
            { label: t("field.address"), value: client.address },
            { label: t("field.notes"), value: client.notes },
          ]}
        />
      </SectionCard>
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">{t("field.projects")}</TabsTrigger>
          {seesBilling ? <TabsTrigger value="statements">{t("masterData.clients.statements")}</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="projects">
      <SectionCard title={t("field.projects")} flush>
        <DataTable
          rows={client.projects}
          getRowId={(p) => p.id}
          clientPageSize={10}
          onRowClick={(p) => router.push(p.status === "DRAFT" ? `/projects/${p.id}/edit` : `/projects/${p.id}/overview`)}
          empty={{ title: t("masterData.clients.noProjects") }}
          columns={[
            {
              id: "name",
              header: t("field.project"),
              cell: (p) => (
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code}</p>
                </div>
              ),
              sortValue: (p) => p.name,
            },
            { id: "city", header: t("field.city"), cell: (p) => p.city ?? "—" },
            { id: "status", header: t("field.status"), cell: (p) => <StatusBadge domain="project" value={p.status} /> },
            { id: "start", header: t("masterData.clients.start"), cell: (p) => formatDate(p.startDate), sortValue: (p) => p.startDate ?? "" },
            { id: "end", header: t("masterData.clients.end"), cell: (p) => formatDate(p.endDate), sortValue: (p) => p.endDate ?? "" },
          ]}
        />
      </SectionCard>
        </TabsContent>
        {seesBilling ? (
          <TabsContent value="statements">
            <ClientStatements client={client} />
          </TabsContent>
        ) : null}
      </Tabs>
      <ClientSlideOver open={editOpen} client={client} onOpenChange={setEditOpen} />
    </>
  );
}

export function ClientDetailView({ clientId }: { clientId: string }) {
  const query = useGetClientQuery(clientId);
  return <QueryState query={query}>{(client) => <ClientDetailBody client={client} />}</QueryState>;
}
