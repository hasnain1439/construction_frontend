"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Pencil, Plus, ReceiptText, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useGetSupplierQuery } from "@/api/services/masterData.api";
import {
  useCancelPurchaseOrderMutation,
  useCreatePurchaseOrderMutation,
  useGetPurchaseOrderQuery,
  useGetPurchaseOrdersQuery,
  useUpdatePurchaseOrderMutation,
} from "@/api/services/procurement.api";
import type { DeliverTo, PurchaseOrder, PurchaseOrdersQuery } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { LineItemsEditor } from "@/components/common/LineItemsEditor";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextareaField } from "@/components/forms/TextareaField";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useStatusT, useT, type TranslationKey } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { useSiteProjectOptions, useSupplierOptions } from "../options";
import { purchaseOrderSchema, type PurchaseOrderValues } from "../schemas";

const BASE = "/suppliers-stock/purchase-orders";
const PO_STATUSES = ["OPEN", "PARTLY_RECEIVED", "RECEIVED", "CANCELLED"] as const;
/** "Central Store" or the site name, in the current language. */
const destination = (t: (key: TranslationKey) => string, po: Pick<PurchaseOrder, "deliverTo" | "project" | "location">) =>
  po.deliverTo === "STORE" ? t("field.centralStore") : (po.project?.name ?? po.location.name);

export function PurchaseOrdersView() {
  const t = useT();
  const ts = useStatusT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const canCreate = useCan("procurement.order.create") && !readOnly;
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "", status: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetPurchaseOrdersQuery(list.query as PurchaseOrdersQuery);
  const columns: Column<PurchaseOrder>[] = [
    { id: "number", header: t("procurement.orders.colOrder"), cell: (o) => <span className="font-medium tabular">{o.number}</span> },
    { id: "supplier", header: t("field.supplier"), cell: (o) => o.supplier.name },
    { id: "to", header: t("procurement.common.deliverTo"), cell: (o) => destination(t, o) },
    { id: "expected", header: t("field.expected"), cell: (o) => formatDate(o.expectedDate), sortValue: (o) => o.expectedDate ?? "" },
    { id: "items", header: t("field.materials"), cell: (o) => o.items.map((i) => i.material.name).join(", ") },
    { id: "total", header: t("field.value"), align: "right", cell: (o) => <MoneyText paisa={o.totalPaisa} /> },
    { id: "status", header: t("field.status"), cell: (o) => <StatusBadge domain="purchaseOrder" value={o.status} /> },
  ];
  return (
    <>
      <PageHeader
        title={t("procurement.orders.listTitle")}
        description={t("procurement.orders.listDesc")}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.purchaseOrders") }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href={`${BASE}/new`}>
                <Plus data-icon="inline-start" />
                {t("procurement.orders.newOrder")}
              </Link>
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label={t("field.supplier")} value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={PO_STATUSES.map((value) => ({ value, label: ts("purchaseOrder", value) }))}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(o) => o.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(o) => router.push(`${BASE}/${o.id}`)}
          empty={{ title: t("procurement.orders.emptyTitle"), description: t("procurement.orders.emptyDesc"), icon: ClipboardList }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}

function OrderBody({ order }: { order: PurchaseOrder }) {
  const t = useT();
  const router = useRouter();
  const readOnly = useReadOnly();
  const editable = useCan("procurement.order.create") && !readOnly;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancel, { isLoading }] = useCancelPurchaseOrderMutation();
  const run = useMutationToast();
  const open = order.status === "OPEN";
  const canCancel = open && order.purchases.length === 0;

  return (
    <>
      <PageHeader
        title={order.number}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.purchaseOrders"), href: BASE }, { label: order.number }]}
        actions={
          editable ? (
            <>
              {order.status === "OPEN" || order.status === "PARTLY_RECEIVED" ? (
                <Button asChild>
                  <Link href={`/suppliers-stock/purchases/new?po=${order.id}`}>
                    <ReceiptText data-icon="inline-start" />
                    {t("procurement.orders.recordPurchase")}
                  </Link>
                </Button>
              ) : null}
              {open ? (
                <Button asChild variant="outline">
                  <Link href={`${BASE}/${order.id}/edit`}>
                    <Pencil data-icon="inline-start" />
                    {t("common.edit")}
                  </Link>
                </Button>
              ) : null}
              {canCancel ? (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  <XCircle data-icon="inline-start" />
                  {t("procurement.orders.cancelOrder")}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <DocumentHeader
        title={t("procurement.common.purchaseOrder")}
        number={order.number}
        status={<StatusBadge domain="purchaseOrder" value={order.status} />}
        party={t("procurement.common.route", { from: order.supplier.name, to: destination(t, order) })}
        meta={[
          { label: t("field.expected"), value: formatDate(order.expectedDate) },
          { label: t("field.value"), value: <MoneyText paisa={order.totalPaisa} /> },
          { label: t("field.created"), value: `${formatDate(order.createdAt)} · ${order.createdBy?.name ?? ""}` },
          { label: t("field.note"), value: order.note },
        ]}
      />
      <SectionCard title={t("procurement.orders.orderedVsReceived")} flush>
        <DataTable
          rows={order.items}
          getRowId={(i) => i.id}
          clientPageSize={0}
          empty={{ title: t("procurement.common.noMaterials") }}
          columns={[
            { id: "material", header: t("field.material"), cell: (i) => <span className="font-medium">{i.material.name}</span> },
            { id: "ordered", header: t("procurement.orders.ordered"), align: "right", cell: (i) => formatQty(i.orderedQty, i.material.unit) },
            { id: "received", header: t("field.received"), align: "right", cell: (i) => formatQty(i.receivedQty, i.material.unit) },
            { id: "pending", header: t("procurement.orders.pending"), align: "right", cell: (i) => (i.pendingQty ? <span className="font-medium text-warning">{formatQty(i.pendingQty, i.material.unit)}</span> : "—") },
            { id: "rate", header: t("field.rate"), align: "right", cell: (i) => <MoneyText paisa={i.ratePaisa} /> },
            { id: "amount", header: t("field.amount"), align: "right", cell: (i) => <MoneyText paisa={i.amountPaisa} /> },
          ]}
        />
      </SectionCard>
      <SectionCard title={t("procurement.orders.purchasesAgainst")} flush>
        <DataTable
          rows={order.purchases}
          getRowId={(p) => p.id}
          clientPageSize={0}
          onRowClick={(p) => router.push(`/suppliers-stock/purchases/${p.id}`)}
          empty={{ title: t("procurement.orders.nothingReceived"), compact: true }}
          columns={[
            { id: "number", header: t("procurement.common.purchase"), cell: (p) => <span className="font-medium tabular">{p.number}</span> },
            { id: "challan", header: t("procurement.common.challan"), cell: (p) => p.challanNo },
            { id: "date", header: t("field.date"), cell: (p) => formatDate(p.purchaseDate) },
            { id: "status", header: t("field.status"), cell: (p) => <StatusBadge domain="purchase" value={p.status} /> },
          ]}
        />
      </SectionCard>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("procurement.common.cancelTitle", { number: order.number })}
        description={t("procurement.orders.cancelDesc")}
        confirmLabel={t("procurement.orders.cancelOrder")}
        loading={isLoading}
        onConfirm={async () => {
          const ok = await run(() => cancel(order.id).unwrap(), { success: t("procurement.common.cancelled", { number: order.number }) });
          if (ok) setCancelOpen(false);
        }}
      />
    </>
  );
}

export function PurchaseOrderDetailView({ orderId }: { orderId: string }) {
  const query = useGetPurchaseOrderQuery(orderId);
  return <QueryState query={query}>{(order) => <OrderBody order={order} />}</QueryState>;
}

const FORM_ID = "purchase-order-form";
type Line = PurchaseOrderValues["items"][number];
const emptyLine = (): Line => ({ materialId: null, orderedQty: null, ratePaisa: null });

function OrderForm({ order }: { order?: PurchaseOrder }) {
  const t = useT();
  const router = useRouter();
  const suppliers = useSupplierOptions();
  const projects = useSiteProjectOptions();
  const [create, { isLoading: creating }] = useCreatePurchaseOrderMutation();
  const [update, { isLoading: updating }] = useUpdatePurchaseOrderMutation();
  const run = useMutationToast();
  const form = useForm<PurchaseOrderValues, unknown, z.output<typeof purchaseOrderSchema>>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: order
      ? {
          supplierId: order.supplier.id,
          deliverTo: order.deliverTo,
          projectId: order.project?.id ?? null,
          expectedDate: order.expectedDate ?? "",
          note: order.note ?? "",
          items: order.items.map((i) => ({ materialId: i.material.id, orderedQty: String(i.orderedQty), ratePaisa: i.ratePaisa })),
        }
      : { supplierId: null, deliverTo: "STORE", projectId: null, expectedDate: "", note: "", items: [emptyLine()] },
  });
  const [supplierId, deliverTo] = useWatch({ control: form.control, name: ["supplierId", "deliverTo"] });
  const supplier = useGetSupplierQuery(supplierId ?? "", { skip: !supplierId });
  const agreed = new Map((supplier.data?.rates ?? []).map((r) => [r.material.id, r.ratePaisa]));

  const onSubmit = async (v: z.output<typeof purchaseOrderSchema>) => {
    const items = v.items.map((i) => ({ materialId: i.materialId, orderedQty: i.orderedQty, ratePaisa: i.ratePaisa }));
    const result = order
      ? await run(() => update({ id: order.id, body: { items, expectedDate: v.expectedDate || null, note: v.note || null } }).unwrap(), { success: t("procurement.common.saved", { number: order.number }), setError: form.setError })
      : await run(
          () =>
            create({
              supplierId: v.supplierId,
              deliverTo: v.deliverTo as DeliverTo,
              ...(v.deliverTo === "SITE" && v.projectId ? { projectId: v.projectId } : {}),
              ...(v.expectedDate ? { expectedDate: v.expectedDate } : {}),
              ...(v.note ? { note: v.note } : {}),
              items,
            }).unwrap(),
          { success: (o) => t("procurement.orders.created", { number: o.number }), setError: form.setError },
        );
    if (result) router.push(`${BASE}/${result.id}`);
  };

  return (
    <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
      <SectionCard title={t("procurement.common.supplierAndDelivery")}>
        <div className="space-y-4">
          <FieldGrid>
            <ComboboxField name="supplierId" label={t("field.supplier")} required options={suppliers.options} loading={suppliers.loading} disabled={Boolean(order)} />
            <DateField name="expectedDate" label={t("procurement.orders.expectedBy")} />
          </FieldGrid>
          <SegmentedField<DeliverTo>
            name="deliverTo"
            label={t("procurement.common.deliverTo")}
            disabled={Boolean(order)}
            options={[
              { value: "STORE", label: t("field.centralStore") },
              { value: "SITE", label: t("procurement.common.directlyToSite") },
            ]}
          />
          {deliverTo === "SITE" ? <ComboboxField name="projectId" label={t("procurement.common.projectSite")} required options={projects.options} loading={projects.loading} disabled={Boolean(order)} /> : null}
        </div>
      </SectionCard>
      <SectionCard title={t("field.materials")}>
        <LineItemsEditor
          name="items"
          emptyRow={emptyLine}
          columns={[
            { key: "orderedQty", label: t("field.quantity"), kind: "quantity", required: true, width: "w-40" },
            { key: "ratePaisa", label: t("field.rate"), kind: "money", required: true, width: "w-40" },
          ]}
          amount={{ qtyKey: "orderedQty", rateKey: "ratePaisa" }}
          onMaterialChange={(index, material) => {
            const rate = material ? agreed.get(material.id) : undefined;
            if (rate && !form.getValues(`items.${index}.ratePaisa`)) form.setValue(`items.${index}.ratePaisa`, rate);
          }}
        />
      </SectionCard>
      <SectionCard>
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </SectionCard>
      <FormActions formId={FORM_ID} submitLabel={t(order ? "procurement.orders.saveOrder" : "procurement.orders.createOrder")} loading={creating || updating} onCancel={() => router.push(order ? `${BASE}/${order.id}` : BASE)} />
    </Form>
  );
}

export function PurchaseOrderFormView({ orderId }: { orderId?: string }) {
  const t = useT();
  const query = useGetPurchaseOrderQuery(orderId ?? "", { skip: !orderId });
  const header = (title: string, crumbs: Array<{ label: string; href?: string }>) => <PageHeader title={title} breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.purchaseOrders"), href: BASE }, ...crumbs]} />;
  if (!orderId) {
    return (
      <>
        {header(t("procurement.orders.newTitle"), [{ label: t("procurement.common.new") }])}
        <OrderForm />
      </>
    );
  }
  return (
    <QueryState query={query}>
      {(order) => (
        <>
          {header(t("procurement.orders.editTitle", { number: order.number }), [{ label: order.number, href: `${BASE}/${order.id}` }, { label: t("common.edit") }])}
          <OrderForm order={order} />
        </>
      )}
    </QueryState>
  );
}
