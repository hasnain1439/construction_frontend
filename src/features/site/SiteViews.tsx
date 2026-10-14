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
import { useT, type TranslationKey } from "@/i18n/useT";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { formatPhone } from "@/lib/phone";
import { formatQty } from "@/lib/quantity";
import { OwnerDeliverySlideOver, RecordUsageSlideOver } from "./SiteSlideOvers";

const editable = (p: ProjectDetail) => p.status === "ACTIVE" || p.status === "CLOSEOUT";

// ─── Incoming ───────────────────────────────────────────────────────────────

export function IncomingView({ projectId }: { projectId: string }) {
  const t = useT();
  const incoming = useGetIncomingQuery(projectId);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("cashSite.site.crumbIncoming")}>
      {(project) =>
        incoming.isLoading ? (
          <CardsSkeleton count={2} height="h-32" />
        ) : !incoming.data ? (
          <SectionCard>
            <EmptyState title={t("cashSite.site.incomingLoadFailed")} />
          </SectionCard>
        ) : incoming.data.count === 0 ? (
          <SectionCard>
            <EmptyState icon={Inbox} title={t("cashSite.site.nothingOnWay")} description={t("cashSite.site.nothingOnWayDesc")} />
          </SectionCard>
        ) : (
          <div className="space-y-4">
            {incoming.data.blindCount ? (
              <InlineAlert tone="info" title={t("cashSite.site.blindCount")}>
                {t("cashSite.site.blindCountBody")}
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
                      <StatusBadge tone="info" label={doc.type === "DISPATCH" ? t("cashSite.site.fromStore") : t("cashSite.site.directFromSupplier")} />
                    </span>
                  }
                  description={
                    doc.type === "DISPATCH"
                      ? t("cashSite.site.dispatchDesc", { from: doc.from.type === "STORE" ? t("field.centralStore") : doc.from.name, date: formatDateTime(doc.dispatchedAt) })
                      : t("cashSite.site.purchaseDesc", { supplier: doc.supplier.name, challan: doc.challanNo, date: formatDate(doc.purchaseDate) })
                  }
                  actions={
                    editable(project) ? (
                      <Button asChild>
                        <Link href={href}>
                          <PackageCheck data-icon="inline-start" />
                          {t("cashSite.site.receive")}
                        </Link>
                      </Button>
                    ) : null
                  }
                >
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span>
                      <span className="text-muted-foreground">{t("cashSite.site.vehicle")}: </span>
                      <bdi>{doc.vehicleNo ?? "—"}</bdi>
                    </span>
                    {doc.type === "DISPATCH" ? (
                      <span>
                        <span className="text-muted-foreground">{t("cashSite.site.driver")}: </span>
                        <bdi>{[doc.driverName, doc.driverPhone ? formatPhone(doc.driverPhone) : null].filter(Boolean).join(" · ") || "—"}</bdi>
                      </span>
                    ) : null}
                    <span>
                      <span className="text-muted-foreground">{t("field.materials")}: </span>
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
  const t = useT();
  const columns: Column<ComparisonRow>[] = [
    { id: "material", header: t("field.material"), cell: (r) => <span className="font-medium">{r.material.name}</span> },
    { id: "sent", header: t("field.sent"), align: "right", cell: (r) => formatQty(r.expectedQty, r.material.unit) },
    { id: "counted", header: t("field.counted"), align: "right", cell: (r) => formatQty(r.countedQty, r.material.unit) },
    { id: "damaged", header: t("field.damaged"), align: "right", cell: (r) => (r.damagedQty ? formatQty(r.damagedQty, r.material.unit) : "—") },
    { id: "result", header: t("cashSite.site.colResult"), cell: (r) => <DifferenceBadge result={r.result} difference={r.differenceQty} unit={r.material.unit} /> },
  ];
  return (
    <SectionCard title={t("cashSite.site.countSavedTitle")} actions={<Button onClick={onDone}>{t("cashSite.site.backToIncoming")}</Button>} flush>
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
  const t = useT();
  const form = useForm<ReceiveValues, unknown, z.output<typeof receiveSchema>>({
    resolver: zodResolver(receiveSchema),
    defaultValues: { note: "", items: lines.map((l) => ({ materialId: l.id, material: { id: l.id, name: l.name, unit: l.unit }, receivedQty: null, damagedQty: null, note: "", photo: null })) },
  });
  const columns: LineColumn[] = [
    { key: "receivedQty", label: t("field.counted"), kind: "quantity", required: true, width: "w-36" },
    { key: "damagedQty", label: t("field.damaged"), kind: "quantity", width: "w-32" },
    { key: "note", label: t("field.note"), kind: "text", placeholder: t("cashSite.site.notePlaceholder"), width: "w-56" },
    ...(withPhoto ? ([{ key: "photo", label: t("field.photo"), kind: "photo", width: "w-32" }] as LineColumn[]) : []),
  ];
  return (
    <Form form={form} onSubmit={(v) => onSubmit(v, form.setError)} id="receive-form">
      <SectionCard title={t("cashSite.site.countWhatArrived")} description={blind ? t("cashSite.site.blindCountDesc") : undefined}>
        <LineItemsEditor
          name="items"
          materialMode="fixed"
          columns={columns}
          info={(row) => {
            const l = lines.find((x) => x.id === row.materialId);
            return l?.expected !== undefined ? t("cashSite.site.sentQty", { qty: formatQty(l.expected, l.unit) }) : null;
          }}
        />
      </SectionCard>
      <TextareaField name="note" label={t("field.note")} rows={2} />
      <FormActions formId="receive-form" submitLabel={t("cashSite.site.saveCount")} loading={loading} />
    </Form>
  );
}

export function ReceiveView({ projectId, kind, docId }: { projectId: string; kind: "dispatch" | "purchase"; docId: string }) {
  const t = useT();
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
    <ProjectPageShell projectId={projectId} crumb={t("cashSite.site.receive")}>
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
                  title={d ? t("cashSite.site.gatePass") : t("cashSite.site.directDelivery")}
                  number={d?.number ?? p!.number}
                  status={d ? <StatusBadge domain="dispatch" value={d.status} /> : <StatusBadge domain="purchase" value={p!.status} />}
                  party={
                    d
                      ? t("cashSite.site.fromParty", { name: d.from.type === "STORE" ? t("field.centralStore") : d.from.name })
                      : t("cashSite.site.fromSupplierChallan", { name: p!.supplier.name, challan: p!.challanNo })
                  }
                  meta={[
                    { label: t("cashSite.site.vehicle"), value: d?.vehicleNo ?? p?.vehicleNo },
                    ...(d ? [{ label: t("cashSite.site.driver"), value: [d.driverName, d.driverPhone ? formatPhone(d.driverPhone) : null].filter(Boolean).join(" · ") || null }] : []),
                    { label: d ? t("field.sent") : t("field.date"), value: d ? formatDateTime(d.dispatchedAt) : formatDate(p!.purchaseDate) },
                  ]}
                />
                {blind && pending ? (
                  <InlineAlert tone="info" title={t("cashSite.site.blindCount")}>
                    <EyeOff className="me-1 inline size-4" aria-hidden />
                    {t("cashSite.site.blindCountReceiveBody")}
                  </InlineAlert>
                ) : null}
                {result ? (
                  <Comparison rows={result} onDone={() => router.push(back)} />
                ) : !pending ? (
                  <SectionCard title={t("cashSite.site.alreadyReceived")} flush>
                    {d ? (
                      <DispatchItemsTable dispatch={d} />
                    ) : (
                      <div className="p-5 text-sm text-muted-foreground">{t("cashSite.site.countedOn", { date: formatDateTime(p!.receivedAt) })}</div>
                    )}
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
                        success: t("cashSite.site.docReceived", { number: d?.number ?? p!.number }),
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
  const t = useT();
  const dispatches = useGetDispatchesQuery({ projectId, limit: 100 });
  const purchases = useGetPurchasesQuery({ projectId, limit: 100 });
  const owner = useGetOwnerDeliveriesQuery({ projectId, limit: 50 });
  const [open, setOpen] = useState(false);
  const received = useMemo(() => {
    const rows = [
      ...(dispatches.data?.items ?? [])
        .filter((d) => d.to.projectId === projectId && d.status !== "ON_THE_WAY" && d.status !== "CANCELLED")
        .map((d) => ({
          id: d.id,
          number: d.number,
          kindKey: "cashSite.site.gatePass" as TranslationKey,
          from: d.from.type === "STORE" ? null : d.from.name,
          date: d.receivedAt ?? d.dispatchedAt,
          status: <StatusBadge domain="dispatch" value={d.status} />,
          materials: d.items.map((i) => `${formatQty(i.receivedQty, i.material.unit)} ${i.material.name}`).join(", "),
        })),
      ...(purchases.data?.items ?? [])
        .filter((p) => p.deliverTo === "SITE" && p.status !== "PENDING_RECEIPT")
        .map((p) => ({
          id: p.id,
          number: p.number,
          kindKey: "cashSite.site.directPurchase" as TranslationKey,
          from: p.supplier.name as string | null,
          date: p.purchaseDate,
          status: <StatusBadge domain="purchase" value={p.status} />,
          materials: p.materials.join(", "),
        })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [dispatches.data, purchases.data, projectId]);

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("cashSite.site.crumbDeliveries")}
      actions={(project) =>
        editable(project) ? (
          <Button asChild variant="outline">
            <Link href={projectHref(project.id, "/site/deliveries/purchase")}>
              <ReceiptText data-icon="inline-start" />
              {t("cashSite.site.recordSitePurchase")}
            </Link>
          </Button>
        ) : null
      }
    >
      {(project) => (
        <Tabs defaultValue="received" className="gap-5">
          <TabsList>
            <TabsTrigger value="received">{t("cashSite.site.tabReceived")}</TabsTrigger>
            <TabsTrigger value="owner">{t("cashSite.site.ownerDeliveries")}</TabsTrigger>
          </TabsList>
          <TabsContent value="received">
            <SectionCard flush>
              <DataTable
                rows={received}
                getRowId={(r) => r.id}
                loading={dispatches.isLoading || purchases.isLoading}
                error={dispatches.error ?? purchases.error}
                clientPageSize={20}
                empty={{ title: t("cashSite.site.nothingReceived"), icon: PackageCheck }}
                columns={[
                  { id: "number", header: t("cashSite.site.colDocument"), cell: (r) => <span className="font-medium tabular">{r.number}</span> },
                  { id: "kind", header: t("field.type"), cell: (r) => t(r.kindKey) },
                  { id: "from", header: t("field.from"), cell: (r) => r.from ?? t("field.centralStore") },
                  { id: "date", header: t("field.date"), cell: (r) => formatDate(r.date), sortValue: (r) => r.date },
                  { id: "materials", header: t("field.materials"), cell: (r) => <span className="text-sm text-muted-foreground">{r.materials}</span> },
                  { id: "status", header: t("field.status"), cell: (r) => r.status },
                ]}
              />
            </SectionCard>
          </TabsContent>
          <TabsContent value="owner">
            <SectionCard
              flush
              title={t("cashSite.site.ownerDeliveries")}
              description={t("cashSite.site.ownerDeliveriesDesc")}
              actions={
                editable(project) ? (
                  <Button size="sm" onClick={() => setOpen(true)}>
                    <Plus data-icon="inline-start" />
                    {t("cashSite.site.recordOwnerDelivery")}
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
                empty={{ title: t("cashSite.site.noOwnerDeliveries"), compact: true }}
                columns={[
                  { id: "date", header: t("field.date"), cell: (d) => formatDate(d.deliveryDate) },
                  { id: "items", header: t("field.materials"), cell: (d) => d.items.map((i) => `${formatQty(i.qty, i.material.unit)} ${i.material.name}`).join(", ") },
                  { id: "note", header: t("field.note"), cell: (d) => d.note ?? "" },
                  { id: "by", header: t("cashSite.site.recordedBy"), cell: (d) => d.createdBy?.name ?? "—" },
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
  const t = useT();
  const usage = useGetUsageQuery({ projectId, limit: 100 });
  const stock = useGetProjectStockQuery(projectId);
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => {
    const map = new Map<string, MaterialUsage[]>();
    for (const u of usage.data?.items ?? []) map.set(u.usageDate, [...(map.get(u.usageDate) ?? []), u]);
    return [...map.entries()];
  }, [usage.data]);
  const ownerTag = t("cashSite.site.ownerTag");
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("cashSite.site.crumbUsage")}
      actions={(project) =>
        editable(project) ? (
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("cashSite.site.recordUsage")}
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
              <EmptyState icon={ClipboardCheck} title={t("cashSite.site.noUsage")} description={t("cashSite.site.noUsageDesc")} />
            </SectionCard>
          ) : (
            groups.map(([date, entries]) => (
              <SectionCard key={date} title={formatDate(date)} flush>
                <ul className="divide-y">
                  {entries.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium">{u.items.map((i) => `${formatQty(i.qty, i.material.unit)} ${i.material.name}${i.ownerSupplied ? ` ${ownerTag}` : ""}`).join(", ")}</p>
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
  const t = useT();
  const stock = useGetProjectStockQuery(projectId);
  const seesRates = useCan("fields.rates");
  const columns: Column<SiteStockRow>[] = [
    { id: "material", header: t("field.material"), sortValue: (r) => r.material.name, cell: (r) => <span className="font-medium">{r.material.name}</span> },
    { id: "received", header: t("field.received"), align: "right", cell: (r) => formatQty(r.receivedContractor, r.material.unit) },
    { id: "owner", header: t("cashSite.site.colFromOwner"), align: "right", cell: (r) => (r.receivedOwner ? formatQty(r.receivedOwner, r.material.unit) : "—") },
    { id: "used", header: t("cashSite.site.colUsed"), align: "right", cell: (r) => formatQty(r.used, r.material.unit) },
    { id: "out", header: t("cashSite.site.colSentOut"), align: "right", cell: (r) => (r.transferredOut ? formatQty(r.transferredOut, r.material.unit) : "—") },
    { id: "adj", header: t("cashSite.site.colAdjusted"), align: "right", cell: (r) => (r.adjustments ? formatQty(r.adjustments, r.material.unit) : "—") },
    {
      id: "stock",
      header: t("cashSite.site.colInStock"),
      align: "right",
      sortValue: (r) => r.inStock,
      cell: (r) => <span className="font-semibold tabular">{formatQty(r.inStock, r.material.unit)}</span>,
    },
    { id: "count", header: t("cashSite.site.colLastCount"), cell: (r) => formatDate(r.lastCountAt) },
    { id: "avg", header: t("cashSite.site.colAvgRate"), align: "right", hidden: !seesRates, cell: (r) => <MoneyText paisa={r.avgRatePaisa ?? undefined} /> },
    { id: "value", header: t("field.value"), align: "right", hidden: !seesRates, cell: (r) => <MoneyText paisa={r.valuePaisa} /> },
  ];
  return (
    <ProjectPageShell projectId={projectId} crumb={t("cashSite.site.crumbStock")}>
      {() => (
        <>
          {stock.data?.summary.totalValuePaisa !== undefined ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label={t("cashSite.site.kpiStockValue")} icon={Wallet} value={formatPKRShort(stock.data.summary.totalValuePaisa)} hint={t("cashSite.site.kpiStockValueHint")} />
              <KpiCard label={t("cashSite.site.kpiMaterialsInStock")} icon={PackageCheck} value={stock.data.summary.materials} />
              <KpiCard
                label={t("cashSite.site.colLastCount")}
                icon={ClipboardCheck}
                value={stock.data.summary.lastCountAt ? formatDate(stock.data.summary.lastCountAt) : t("cashSite.site.never")}
              />
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
              empty={{ title: t("cashSite.site.noStock"), description: t("cashSite.site.noStockDesc"), icon: PackageCheck }}
            />
          </SectionCard>
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Stock counts & transfers ───────────────────────────────────────────────

export function CountsView({ projectId }: { projectId: string }) {
  const t = useT();
  const stock = useGetProjectStockQuery(projectId);
  const counts = useGetStockCountsQuery({ projectId, limit: 50 });
  const incoming = useGetIncomingQuery(projectId);
  // Moving stock between sites is a dispatch.
  const office = useCan("procurement.dispatch.create");
  const canCount = useCan("inventory.count.create");
  const seesRates = useCan("fields.rates");
  const [open, setOpen] = useState<"count" | "transfer" | null>(null);
  const items = stock.data?.items ?? [];
  const system = new Map(items.map((i) => [i.material.id, i.inStockOwner > 0 && i.inStockContractor === 0 ? i.inStockOwner : i.inStockContractor]));

  const columns: Column<StockCount>[] = [
    { id: "number", header: t("cashSite.site.colCount"), cell: (c) => <span className="font-medium tabular">{c.number}</span> },
    { id: "date", header: t("field.counted"), cell: (c) => formatDateTime(c.countedAt), sortValue: (c) => c.countedAt },
    {
      id: "diffs",
      header: t("cashSite.site.colDifferences"),
      cell: (c) =>
        c.items.filter((i) => i.difference !== 0).length === 0 ? (
          <StatusBadge tone="success" label={t("cashSite.site.allMatched")} />
        ) : (
          <span className="text-sm">
            {c.items
              .filter((i) => i.difference !== 0)
              .map((i) => `${i.material.name} ${i.difference > 0 ? "+" : ""}${formatQty(i.difference, i.material.unit)}`)
              .join(", ")}
          </span>
        ),
    },
    { id: "value", header: t("field.value"), align: "right", hidden: !seesRates, cell: (c) => <MoneyText paisa={c.summary.differenceValuePaisa} /> },
    { id: "by", header: t("field.by"), cell: (c) => c.createdBy?.name ?? "—" },
  ];

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("cashSite.site.crumbCounts")}
      actions={(project) =>
        editable(project) && stock.data?.location ? (
          <>
            {canCount ? (
              <Button onClick={() => setOpen("count")}>
                <ClipboardCheck data-icon="inline-start" />
                {t("cashSite.site.newCount")}
              </Button>
            ) : null}
            {office ? (
              <Button variant="outline" onClick={() => setOpen("transfer")}>
                <ArrowRightLeft data-icon="inline-start" />
                {t("cashSite.site.transfer")}
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {(project) => (
        <>
          <SectionCard flush title={t("cashSite.site.counts")}>
            <DataTable
              rows={counts.data?.items}
              columns={columns}
              getRowId={(c) => c.id}
              loading={counts.isLoading}
              error={counts.error}
              onRetry={counts.refetch}
              empty={{ title: t("cashSite.site.noCounts"), icon: ClipboardCheck }}
            />
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
