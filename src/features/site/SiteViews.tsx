"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, ClipboardCheck, EyeOff, Inbox, PackageCheck, Plus, ReceiptText, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import type { z } from "zod";
import { useGetDispatchesQuery, useGetDispatchQuery, useGetIncomingQuery, useGetOwnerDeliveriesQuery, useReceiveDispatchMutation } from "@/api/services/dispatch.api";
import { useGetProjectStockQuery, useGetStockCountsQuery, useGetUsageQuery } from "@/api/services/inventory.api";
import { useGetPurchaseQuery, useGetPurchasesQuery, useReceivePurchaseMutation } from "@/api/services/procurement.api";
import type { ComparisonRow, MaterialUsage, ProjectDetail, SiteStockRow, StockCount } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DifferenceBadge } from "@/components/common/DifferenceBadge";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { LineItemsEditor, type LineColumn } from "@/components/common/LineItemsEditor";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { TextareaField } from "@/components/forms/TextareaField";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewDispatchSlideOver } from "@/features/procurement/components/DispatchSlideOvers";
import { StockCountSlideOver } from "@/features/procurement/components/StockSlideOvers";
import { applyLineError } from "@/features/procurement/lineErrors";
import { receiveSchema, type ReceiveValues } from "@/features/procurement/schemas";
import { DispatchItemsTable } from "@/features/procurement/views/DispatchViews";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { formatPhone } from "@/lib/phone";
import { formatQty } from "@/lib/quantity";
import { OwnerDeliverySlideOver, RecordUsageSlideOver } from "./SiteSlideOvers";

const editable = (p: ProjectDetail) => p.status === "ACTIVE" || p.status === "CLOSEOUT";

// ─── Incoming ───────────────────────────────────────────────────────────────

export function IncomingView({ projectId }: { projectId: string }) {
  const incoming = useGetIncomingQuery(projectId);
  return (
    <ProjectPageShell projectId={projectId} crumb="Incoming Material">
      {(project) =>
        incoming.isLoading ? (
          <CardsSkeleton count={2} height="h-32" />
        ) : !incoming.data ? (
          <SectionCard>
            <EmptyState title="Couldn't load incoming material" />
          </SectionCard>
        ) : incoming.data.count === 0 ? (
          <SectionCard>
            <EmptyState icon={Inbox} title="Nothing on the way" description="Gate passes and direct deliveries to this site show up here until they are counted." />
          </SectionCard>
        ) : (
          <div className="space-y-4">
            {incoming.data.blindCount ? (
              <InlineAlert tone="info" title="Blind count">
                Count what really arrived. The sent quantities are shown after you save.
              </InlineAlert>
            ) : null}
            {[...incoming.data.dispatches, ...incoming.data.purchases].map((doc) => {
              const href = projectHref(project.id, `/site/incoming/${doc.type === "DISPATCH" ? "dispatch" : "purchase"}/${doc.id}`);
              return (
                <SectionCard
                  key={doc.id}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {doc.type === "DISPATCH" ? <Truck className="size-4 text-primary" aria-hidden /> : <ReceiptText className="size-4 text-primary" aria-hidden />}
                      {doc.number}
                      <StatusBadge tone="info" label={doc.type === "DISPATCH" ? "From store" : "Direct from supplier"} />
                    </span>
                  }
                  description={
                    doc.type === "DISPATCH"
                      ? `${doc.from.type === "STORE" ? "Central Store" : doc.from.name} · sent ${formatDateTime(doc.dispatchedAt)}`
                      : `${doc.supplier.name} · challan ${doc.challanNo} · ${formatDate(doc.purchaseDate)}`
                  }
                  actions={
                    editable(project) ? (
                      <Button asChild>
                        <Link href={href}>
                          <PackageCheck data-icon="inline-start" />
                          Receive
                        </Link>
                      </Button>
                    ) : null
                  }
                >
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span>
                      <span className="text-muted-foreground">Vehicle: </span>
                      {doc.vehicleNo ?? "—"}
                    </span>
                    {doc.type === "DISPATCH" ? (
                      <span>
                        <span className="text-muted-foreground">Driver: </span>
                        {[doc.driverName, doc.driverPhone ? formatPhone(doc.driverPhone) : null].filter(Boolean).join(" · ") || "—"}
                      </span>
                    ) : null}
                    <span>
                      <span className="text-muted-foreground">Materials: </span>
                      {doc.items
                        .map((i) => {
                          const q = "sentQty" in i ? i.sentQty : "challanQty" in i ? i.challanQty : undefined;
                          return q !== undefined ? `${formatQty(q, i.material.unit)} ${i.material.name}` : i.material.name;
                        })
                        .join(", ")}
                    </span>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )
      }
    </ProjectPageShell>
  );
}

// ─── Receive (blind count) ──────────────────────────────────────────────────

function Comparison({ rows, onDone }: { rows: ComparisonRow[]; onDone: () => void }) {
  const columns: Column<ComparisonRow>[] = [
    { id: "material", header: "Material", cell: (r) => <span className="font-medium">{r.material.name}</span> },
    { id: "sent", header: "Sent", align: "right", cell: (r) => formatQty(r.expectedQty, r.material.unit) },
    { id: "counted", header: "Counted", align: "right", cell: (r) => formatQty(r.countedQty, r.material.unit) },
    { id: "damaged", header: "Damaged", align: "right", cell: (r) => (r.damagedQty ? formatQty(r.damagedQty, r.material.unit) : "—") },
    { id: "result", header: "Result", cell: (r) => <DifferenceBadge result={r.result} difference={r.differenceQty} unit={r.material.unit} /> },
  ];
  return (
    <SectionCard title="Count saved — here is what was sent" actions={<Button onClick={onDone}>Back to incoming</Button>} flush>
      <DataTable rows={rows} columns={columns} getRowId={(r) => r.material.id} clientPageSize={0} empty={{ title: "" }} />
    </SectionCard>
  );
}

function ReceiveForm({
  lines,
  withPhoto,
  onSubmit,
  loading,
  blind,
}: {
  lines: Array<{ id: string; name: string; unit: string; expected?: number }>;
  withPhoto: boolean;
  blind: boolean;
  loading: boolean;
  onSubmit: (v: z.output<typeof receiveSchema>, setError: UseFormSetError<ReceiveValues>) => Promise<void>;
}) {
  const form = useForm<ReceiveValues, unknown, z.output<typeof receiveSchema>>({
    resolver: zodResolver(receiveSchema),
    defaultValues: { note: "", items: lines.map((l) => ({ materialId: l.id, material: { id: l.id, name: l.name, unit: l.unit }, receivedQty: null, damagedQty: null, note: "", photo: null })) },
  });
  const columns: LineColumn[] = [
    { key: "receivedQty", label: "Counted", kind: "quantity", required: true, width: "w-36" },
    { key: "damagedQty", label: "Damaged", kind: "quantity", width: "w-32" },
    { key: "note", label: "Note", kind: "text", placeholder: "Needed if short / damaged", width: "w-56" },
    ...(withPhoto ? ([{ key: "photo", label: "Photo", kind: "photo", width: "w-32" }] as LineColumn[]) : []),
  ];
  return (
    <Form form={form} onSubmit={(v) => onSubmit(v, form.setError)} id="receive-form">
      <SectionCard title="Count what arrived" description={blind ? "Blind count: count every material yourself; the sent quantity appears after saving." : undefined}>
        <LineItemsEditor
          name="items"
          materialMode="fixed"
          columns={columns}
          info={(row) => {
            const l = lines.find((x) => x.id === row.materialId);
            return l?.expected !== undefined ? `Sent: ${formatQty(l.expected, l.unit)}` : null;
          }}
        />
      </SectionCard>
      <TextareaField name="note" label="Note" rows={2} />
      <FormActions formId="receive-form" submitLabel="Save count" loading={loading} />
    </Form>
  );
}

export function ReceiveView({ projectId, kind, docId }: { projectId: string; kind: "dispatch" | "purchase"; docId: string }) {
  const dispatch = useGetDispatchQuery(docId, { skip: kind !== "dispatch" });
  const purchase = useGetPurchaseQuery(docId, { skip: kind !== "purchase" });
  const [receiveDispatch, rd] = useReceiveDispatchMutation();
  const [receivePurchase, rp] = useReceivePurchaseMutation();
  const run = useMutationToast();
  const [result, setResult] = useState<ComparisonRow[] | null>(null);
  const router = useRouter();
  const back = projectHref(projectId, "/site/incoming");
  const query = kind === "dispatch" ? dispatch : purchase;

  return (
    <ProjectPageShell projectId={projectId} crumb="Receive">
      {() => (
        <QueryState query={query as { data?: unknown; isLoading: boolean; error?: unknown; refetch?: () => unknown }}>
          {() => {
            const d = kind === "dispatch" ? dispatch.data! : null;
            const p = kind === "purchase" ? purchase.data! : null;
            const pending = d ? d.status === "ON_THE_WAY" : p!.status === "PENDING_RECEIPT";
            const blind = d ? d.blindCount : p!.blindCount;
            const lines = d
              ? d.items.map((i) => ({ id: i.material.id, name: i.material.name, unit: i.material.unit, expected: i.sentQty }))
              : p!.items.map((i) => ({ id: i.material.id, name: i.material.name, unit: i.material.unit, expected: i.challanQty }));
            return (
              <>
                <DocumentHeader
                  title={d ? "Gate pass" : "Direct delivery"}
                  number={d?.number ?? p!.number}
                  status={d ? <StatusBadge domain="dispatch" value={d.status} /> : <StatusBadge domain="purchase" value={p!.status} />}
                  party={d ? `From ${d.from.type === "STORE" ? "Central Store" : d.from.name}` : `From ${p!.supplier.name} · challan ${p!.challanNo}`}
                  meta={[
                    { label: "Vehicle", value: d?.vehicleNo ?? p?.vehicleNo },
                    ...(d ? [{ label: "Driver", value: [d.driverName, d.driverPhone ? formatPhone(d.driverPhone) : null].filter(Boolean).join(" · ") || null }] : []),
                    { label: d ? "Sent" : "Date", value: d ? formatDateTime(d.dispatchedAt) : formatDate(p!.purchaseDate) },
                  ]}
                />
                {blind && pending ? (
                  <InlineAlert tone="info" title="Blind count">
                    <EyeOff className="mr-1 inline size-4" aria-hidden />
                    Count every bag, brick and bundle yourself. What was sent is shown after you save.
                  </InlineAlert>
                ) : null}
                {result ? (
                  <Comparison rows={result} onDone={() => router.push(back)} />
                ) : !pending ? (
                  <SectionCard title="Already received" flush>
                    {d ? <DispatchItemsTable dispatch={d} /> : <div className="p-5 text-sm text-muted-foreground">This delivery was counted on {formatDateTime(p!.receivedAt)}.</div>}
                  </SectionCard>
                ) : (
                  <ReceiveForm
                    lines={lines}
                    withPhoto={Boolean(d)}
                    blind={blind}
                    loading={rd.isLoading || rp.isLoading}
                    onSubmit={async (v, setError) => {
                      const note = v.note ? { note: v.note } : {};
                      const lineNote = (n: string) => (n ? { note: n } : {});
                      const damaged = (q: string | null) => (q ? { damagedQty: q } : {});
                      const save = (): Promise<ComparisonRow[]> =>
                        d
                          ? receiveDispatch({
                              id: d.id,
                              body: {
                                ...note,
                                items: v.items.map((i) => ({ materialId: i.materialId, receivedQty: i.receivedQty, ...damaged(i.damagedQty), ...lineNote(i.note), ...(i.photo ? { photoAttachmentId: i.photo.id } : {}) })),
                              },
                            })
                              .unwrap()
                              .then((r) => r.comparison)
                          : receivePurchase({
                              id: p!.id,
                              body: { ...note, items: v.items.map((i) => ({ materialId: i.materialId, countedQty: i.receivedQty, ...damaged(i.damagedQty), ...lineNote(i.note) })) },
                            })
                              .unwrap()
                              .then((r) => r.comparison);
                      const res = await run(save, {
                        success: `${d?.number ?? p!.number} received`,
                        onError: (_c, error) => applyLineError(error, v.items, setError, "items", { SHORTAGE_NOTE_REQUIRED: "note", DAMAGED_EXCEEDS_COUNTED: "damagedQty" }),
                      });
                      if (res) setResult(res);
                    }}
                  />
                )}
              </>
            );
          }}
        </QueryState>
      )}
    </ProjectPageShell>
  );
}

// ─── Deliveries (history + owner deliveries) ────────────────────────────────

export function DeliveriesView({ projectId }: { projectId: string }) {
  const dispatches = useGetDispatchesQuery({ projectId, limit: 100 });
  const purchases = useGetPurchasesQuery({ projectId, limit: 100 });
  const owner = useGetOwnerDeliveriesQuery({ projectId, limit: 50 });
  const [open, setOpen] = useState(false);
  const received = useMemo(() => {
    const rows = [
      ...(dispatches.data?.items ?? [])
        .filter((d) => d.to.projectId === projectId && d.status !== "ON_THE_WAY" && d.status !== "CANCELLED")
        .map((d) => ({ id: d.id, number: d.number, kind: "Gate pass", from: d.from.type === "STORE" ? "Central Store" : d.from.name, date: d.receivedAt ?? d.dispatchedAt, status: <StatusBadge domain="dispatch" value={d.status} />, materials: d.items.map((i) => `${formatQty(i.receivedQty, i.material.unit)} ${i.material.name}`).join(", ") })),
      ...(purchases.data?.items ?? [])
        .filter((p) => p.deliverTo === "SITE" && p.status !== "PENDING_RECEIPT")
        .map((p) => ({ id: p.id, number: p.number, kind: "Direct purchase", from: p.supplier.name, date: p.purchaseDate, status: <StatusBadge domain="purchase" value={p.status} />, materials: p.materials.join(", ") })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [dispatches.data, purchases.data, projectId]);

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Deliveries"
      actions={(project) =>
        editable(project) ? (
          <Button asChild variant="outline">
            <Link href={projectHref(project.id, "/site/deliveries/purchase")}>
              <ReceiptText data-icon="inline-start" />
              Record site purchase
            </Link>
          </Button>
        ) : null
      }
    >
      {(project) => (
        <Tabs defaultValue="received" className="gap-5">
          <TabsList>
            <TabsTrigger value="received">Maal aaya (received)</TabsTrigger>
            <TabsTrigger value="owner">Owner deliveries</TabsTrigger>
          </TabsList>
          <TabsContent value="received">
            <SectionCard flush>
              <DataTable
                rows={received}
                getRowId={(r) => r.id}
                loading={dispatches.isLoading || purchases.isLoading}
                error={dispatches.error ?? purchases.error}
                clientPageSize={20}
                empty={{ title: "Nothing received yet", icon: PackageCheck }}
                columns={[
                  { id: "number", header: "Document", cell: (r) => <span className="font-medium tabular">{r.number}</span> },
                  { id: "kind", header: "Type", cell: (r) => r.kind },
                  { id: "from", header: "From", cell: (r) => r.from },
                  { id: "date", header: "Date", cell: (r) => formatDate(r.date), sortValue: (r) => r.date },
                  { id: "materials", header: "Materials", cell: (r) => <span className="text-sm text-muted-foreground">{r.materials}</span> },
                  { id: "status", header: "Status", cell: (r) => r.status },
                ]}
              />
            </SectionCard>
          </TabsContent>
          <TabsContent value="owner">
            <SectionCard
              flush
              title="Owner deliveries"
              description="Material the owner sent himself (no cost to you)."
              actions={
                editable(project) ? (
                  <Button size="sm" onClick={() => setOpen(true)}>
                    <Plus data-icon="inline-start" />
                    Record owner delivery
                  </Button>
                ) : null
              }
            >
              <DataTable
                rows={owner.data?.items}
                getRowId={(d) => d.id}
                loading={owner.isLoading}
                error={owner.error}
                onRetry={owner.refetch}
                clientPageSize={20}
                empty={{ title: "No owner deliveries", compact: true }}
                columns={[
                  { id: "date", header: "Date", cell: (d) => formatDate(d.deliveryDate) },
                  { id: "items", header: "Materials", cell: (d) => d.items.map((i) => `${formatQty(i.qty, i.material.unit)} ${i.material.name}`).join(", ") },
                  { id: "note", header: "Note", cell: (d) => d.note ?? "" },
                  { id: "by", header: "Recorded by", cell: (d) => d.createdBy?.name ?? "—" },
                ]}
              />
            </SectionCard>
            <OwnerDeliverySlideOver open={open} onOpenChange={setOpen} projectId={project.id} supplyRules={project.supplyRules} />
          </TabsContent>
        </Tabs>
      )}
    </ProjectPageShell>
  );
}

// ─── Usage ──────────────────────────────────────────────────────────────────

export function UsageView({ projectId }: { projectId: string }) {
  const usage = useGetUsageQuery({ projectId, limit: 100 });
  const stock = useGetProjectStockQuery(projectId);
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => {
    const map = new Map<string, MaterialUsage[]>();
    for (const u of usage.data?.items ?? []) map.set(u.usageDate, [...(map.get(u.usageDate) ?? []), u]);
    return [...map.entries()];
  }, [usage.data]);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Material Usage"
      actions={(project) =>
        editable(project) ? (
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            Record usage
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {usage.isLoading ? (
            <CardsSkeleton count={2} height="h-32" />
          ) : groups.length === 0 ? (
            <SectionCard>
              <EmptyState icon={ClipboardCheck} title="No usage recorded" description="Record what is used each day — maal lag gaya." />
            </SectionCard>
          ) : (
            groups.map(([date, entries]) => (
              <SectionCard key={date} title={formatDate(date)} flush>
                <ul className="divide-y">
                  {entries.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium">{u.items.map((i) => `${formatQty(i.qty, i.material.unit)} ${i.material.name}${i.ownerSupplied ? " (owner)" : ""}`).join(", ")}</p>
                        <p className="text-xs text-muted-foreground">{[u.note, u.createdBy?.name].filter(Boolean).join(" · ")}</p>
                      </div>
                      {u.totalValuePaisa !== undefined ? <MoneyText paisa={u.totalValuePaisa} /> : null}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ))
          )}
          <RecordUsageSlideOver open={open} onOpenChange={setOpen} projectId={project.id} stock={stock.data?.items ?? []} />
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Site stock ─────────────────────────────────────────────────────────────

export function SiteStockView({ projectId }: { projectId: string }) {
  const stock = useGetProjectStockQuery(projectId);
  const seesRates = useCan({ permission: "rates.view" });
  const columns: Column<SiteStockRow>[] = [
    { id: "material", header: "Material", sortValue: (r) => r.material.name, cell: (r) => <span className="font-medium">{r.material.name}</span> },
    { id: "received", header: "Received", align: "right", cell: (r) => formatQty(r.receivedContractor, r.material.unit) },
    { id: "owner", header: "From owner", align: "right", cell: (r) => (r.receivedOwner ? formatQty(r.receivedOwner, r.material.unit) : "—") },
    { id: "used", header: "Used", align: "right", cell: (r) => formatQty(r.used, r.material.unit) },
    { id: "out", header: "Sent out", align: "right", cell: (r) => (r.transferredOut ? formatQty(r.transferredOut, r.material.unit) : "—") },
    { id: "adj", header: "Adjusted", align: "right", cell: (r) => (r.adjustments ? formatQty(r.adjustments, r.material.unit) : "—") },
    { id: "stock", header: "In stock", align: "right", sortValue: (r) => r.inStock, cell: (r) => <span className="font-semibold tabular">{formatQty(r.inStock, r.material.unit)}</span> },
    { id: "count", header: "Last count", cell: (r) => formatDate(r.lastCountAt) },
    { id: "avg", header: "Avg rate", align: "right", hidden: !seesRates, cell: (r) => <MoneyText paisa={r.avgRatePaisa ?? undefined} /> },
    { id: "value", header: "Value", align: "right", hidden: !seesRates, cell: (r) => <MoneyText paisa={r.valuePaisa} /> },
  ];
  return (
    <ProjectPageShell projectId={projectId} crumb="Site Stock">
      {() => (
        <>
          {stock.data?.summary.totalValuePaisa !== undefined ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label="Stock value on site" icon={Wallet} value={formatPKRShort(stock.data.summary.totalValuePaisa)} hint="Contractor stock at average cost" />
              <KpiCard label="Materials in stock" icon={PackageCheck} value={stock.data.summary.materials} />
              <KpiCard label="Last count" icon={ClipboardCheck} value={stock.data.summary.lastCountAt ? formatDate(stock.data.summary.lastCountAt) : "Never"} />
            </div>
          ) : null}
          <SectionCard flush>
            <DataTable
              rows={stock.data?.items}
              columns={columns}
              getRowId={(r) => r.material.id}
              loading={stock.isLoading}
              error={stock.error}
              onRetry={stock.refetch}
              clientPageSize={25}
              empty={{ title: "No stock on this site yet", description: "Dispatches and direct purchases add to it once counted.", icon: PackageCheck }}
            />
          </SectionCard>
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Stock counts & transfers ───────────────────────────────────────────────

export function CountsView({ projectId }: { projectId: string }) {
  const stock = useGetProjectStockQuery(projectId);
  const counts = useGetStockCountsQuery({ projectId, limit: 50 });
  const incoming = useGetIncomingQuery(projectId);
  const office = useCan({ roles: ["THEKEDAR", "PM"] });
  const seesRates = useCan({ permission: "rates.view" });
  const [open, setOpen] = useState<"count" | "transfer" | null>(null);
  const items = stock.data?.items ?? [];
  const system = new Map(items.map((i) => [i.material.id, i.inStockOwner > 0 && i.inStockContractor === 0 ? i.inStockOwner : i.inStockContractor]));

  const columns: Column<StockCount>[] = [
    { id: "number", header: "Count", cell: (c) => <span className="font-medium tabular">{c.number}</span> },
    { id: "date", header: "Counted", cell: (c) => formatDateTime(c.countedAt), sortValue: (c) => c.countedAt },
    {
      id: "diffs",
      header: "Differences",
      cell: (c) =>
        c.items.filter((i) => i.difference !== 0).length === 0 ? (
          <StatusBadge tone="success" label="All matched" />
        ) : (
          <span className="text-sm">
            {c.items
              .filter((i) => i.difference !== 0)
              .map((i) => `${i.material.name} ${i.difference > 0 ? "+" : ""}${formatQty(i.difference, i.material.unit)}`)
              .join(", ")}
          </span>
        ),
    },
    { id: "value", header: "Value", align: "right", hidden: !seesRates, cell: (c) => <MoneyText paisa={c.summary.differenceValuePaisa} /> },
    { id: "by", header: "By", cell: (c) => c.createdBy?.name ?? "—" },
  ];

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Stock Counts & Transfers"
      actions={(project) =>
        editable(project) && stock.data?.location ? (
          <>
            <Button onClick={() => setOpen("count")}>
              <ClipboardCheck data-icon="inline-start" />
              New count
            </Button>
            {office ? (
              <Button variant="outline" onClick={() => setOpen("transfer")}>
                <ArrowRightLeft data-icon="inline-start" />
                Transfer
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {(project) => (
        <>
          <SectionCard flush title="Counts">
            <DataTable rows={counts.data?.items} columns={columns} getRowId={(c) => c.id} loading={counts.isLoading} error={counts.error} onRetry={counts.refetch} empty={{ title: "No counts yet", icon: ClipboardCheck }} />
          </SectionCard>
          {stock.data?.location ? (
            <>
              <StockCountSlideOver
                open={open === "count"}
                onOpenChange={(o) => setOpen(o ? "count" : null)}
                locationId={stock.data.location.id}
                locationName={project.name}
                materials={items.filter((i) => i.inStock !== 0).map((i) => i.material)}
                system={system}
                blind={incoming.data?.blindCount ?? true}
              />
              <NewDispatchSlideOver
                open={open === "transfer"}
                onOpenChange={(o) => setOpen(o ? "transfer" : null)}
                fromOptions={[{ value: stock.data.location.id, label: project.name }]}
                defaultFromId={stock.data.location.id}
                available={items.map((i) => ({ materialId: i.material.id, qty: i.inStockContractor, unit: i.material.unit }))}
                excludeProjectId={project.id}
              />
            </>
          ) : null}
        </>
      )}
    </ProjectPageShell>
  );
}
