"use client";

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
import { formatDate } from "@/lib/dates";
import { BILLING_ACCESS } from "@/lib/navigation";
import { formatPhone } from "@/lib/phone";
import { ClientSlideOver } from "./ClientSlideOver";

export function ClientsView() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const list = useListState({});
  const { data, isLoading, isFetching, error, refetch } = useGetClientsQuery(list.query as ClientsQuery);
  const [addOpen, setAddOpen] = useSearchFlag();

  const columns: Column<Client>[] = [
    { id: "name", header: "Name", cell: (c) => <AvatarName name={c.name} subtitle={c.email ?? undefined} />, sortValue: (c) => c.name },
    { id: "phone", header: "Phone", cell: (c) => <span className="tabular">{formatPhone(c.phone)}</span> },
    { id: "address", header: "Address", cell: (c) => <span className="line-clamp-1 text-muted-foreground">{c.address ?? "—"}</span> },
    { id: "projects", header: "Projects", align: "right", cell: (c) => <span className="tabular">{c.projectsCount ?? 0}</span>, sortValue: (c) => c.projectsCount ?? 0 },
    { id: "added", header: "Added", cell: (c) => formatDate(c.createdAt), sortValue: (c) => c.createdAt },
  ];

  return (
    <>
      <PageHeader
        title="Clients (Owners)"
        description="Home owners you build for."
        breadcrumbs={[{ label: "Sales" }, { label: "Clients" }]}
        actions={
          !readOnly ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              New client
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name, phone or email…" />
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
          empty={{ title: "No clients yet", description: "Add an owner, or create one while starting a new project.", icon: UserRound }}
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
  const router = useRouter();
  const readOnly = useReadOnly();
  const seesBilling = useCan(BILLING_ACCESS);
  const [editOpen, setEditOpen] = useState(false);
  return (
    <>
      <PageHeader
        title={client.name}
        breadcrumbs={[{ label: "Sales" }, { label: "Clients", href: "/sales/clients" }, { label: client.name }]}
        actions={
          !readOnly ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          ) : null
        }
      />
      <InlineAlert tone="info" title="Receives PDFs on WhatsApp">
        Owners have no login. Quotes, bills and statements are shared with them as PDFs.
      </InlineAlert>
      <SectionCard title="Contact">
        <InfoList
          columns={3}
          items={[
            {
              label: "Phone",
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="size-4 text-success" aria-hidden />
                  {formatPhone(client.phone)}
                </span>
              ),
            },
            { label: "Email", value: client.email },
            { label: "Client since", value: formatDate(client.createdAt) },
            { label: "Address", value: client.address },
            { label: "Notes", value: client.notes },
          ]}
        />
      </SectionCard>
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          {seesBilling ? <TabsTrigger value="statements">Statements</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="projects">
      <SectionCard title="Projects" flush>
        <DataTable
          rows={client.projects}
          getRowId={(p) => p.id}
          clientPageSize={10}
          onRowClick={(p) => router.push(p.status === "DRAFT" ? `/projects/${p.id}/edit` : `/projects/${p.id}/overview`)}
          empty={{ title: "No projects for this client yet" }}
          columns={[
            {
              id: "name",
              header: "Project",
              cell: (p) => (
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code}</p>
                </div>
              ),
              sortValue: (p) => p.name,
            },
            { id: "city", header: "City", cell: (p) => p.city ?? "—" },
            { id: "status", header: "Status", cell: (p) => <StatusBadge domain="project" value={p.status} /> },
            { id: "start", header: "Start", cell: (p) => formatDate(p.startDate), sortValue: (p) => p.startDate ?? "" },
            { id: "end", header: "End", cell: (p) => formatDate(p.endDate), sortValue: (p) => p.endDate ?? "" },
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
