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
import { formatDate } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { useSiteProjectOptions, useSupplierOptions } from "../options";
import { purchaseOrderSchema, type PurchaseOrderValues } from "../schemas";

const BASE = "/suppliers-stock/purchase-orders";
const destination = (po: Pick<PurchaseOrder, "deliverTo" | "project" | "location">) => (po.deliverTo === "STORE" ? "Central Store" : (po.project?.name ?? po.location.name));

export function PurchaseOrdersView() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const canCreate = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "", status: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetPurchaseOrdersQuery(list.query as PurchaseOrdersQuery);
  const columns: Column<PurchaseOrder>[] = [
    { id: "number", header: "Order", cell: (o) => <span className="font-medium tabular">{o.number}</span> },
    { id: "supplier", header: "Supplier", cell: (o) => o.supplier.name },
    { id: "to", header: "Deliver to", cell: destination },
    { id: "expected", header: "Expected", cell: (o) => formatDate(o.expectedDate), sortValue: (o) => o.expectedDate ?? "" },
    { id: "items", header: "Materials", cell: (o) => o.items.map((i) => i.material.name).join(", ") },
    { id: "total", header: "Value", align: "right", cell: (o) => <MoneyText paisa={o.totalPaisa} /> },
    { id: "status", header: "Status", cell: (o) => <StatusBadge domain="purchaseOrder" value={o.status} /> },
  ];
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Orders placed with suppliers. They fill up as challans arrive against them."
        breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Purchase Orders" }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href={`${BASE}/new`}>
                <Plus data-icon="inline-start" />
                New order
              </Link>
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label="Supplier" value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
        <FilterSelect
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "OPEN", label: "Open" },
            { value: "PARTLY_RECEIVED", label: "Partly received" },
            { value: "RECEIVED", label: "Received" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
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
          empty={{ title: "No purchase orders", description: "Create an order to agree quantities and rates before the material arrives.", icon: ClipboardList }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}

function OrderBody({ order }: { order: PurchaseOrder }) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const editable = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancel, { isLoading }] = useCancelPurchaseOrderMutation();
  const run = useMutationToast();
  const open = order.status === "OPEN";
  const canCancel = open && order.purchases.length === 0;

  return (
    <>
      <PageHeader
        title={order.number}
        breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Purchase Orders", href: BASE }, { label: order.number }]}
        actions={
          editable ? (
            <>
              {order.status === "OPEN" || order.status === "PARTLY_RECEIVED" ? (
                <Button asChild>
                  <Link href={`/suppliers-stock/purchases/new?po=${order.id}`}>
                    <ReceiptText data-icon="inline-start" />
                    Record purchase
                  </Link>
                </Button>
              ) : null}
              {open ? (
                <Button asChild variant="outline">
                  <Link href={`${BASE}/${order.id}/edit`}>
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Link>
                </Button>
              ) : null}
              {canCancel ? (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  <XCircle data-icon="inline-start" />
                  Cancel order
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <DocumentHeader
        title="Purchase order"
        number={order.number}
        status={<StatusBadge domain="purchaseOrder" value={order.status} />}
        party={`${order.supplier.name} → ${destination(order)}`}
        meta={[
          { label: "Expected", value: formatDate(order.expectedDate) },
          { label: "Value", value: <MoneyText paisa={order.totalPaisa} /> },
          { label: "Created", value: `${formatDate(order.createdAt)} · ${order.createdBy?.name ?? ""}` },
          { label: "Note", value: order.note },
        ]}
      />
      <SectionCard title="Ordered vs received" flush>
        <DataTable
          rows={order.items}
          getRowId={(i) => i.id}
          clientPageSize={0}
          empty={{ title: "No materials" }}
          columns={[
            { id: "material", header: "Material", cell: (i) => <span className="font-medium">{i.material.name}</span> },
            { id: "ordered", header: "Ordered", align: "right", cell: (i) => formatQty(i.orderedQty, i.material.unit) },
            { id: "received", header: "Received", align: "right", cell: (i) => formatQty(i.receivedQty, i.material.unit) },
            { id: "pending", header: "Pending", align: "right", cell: (i) => (i.pendingQty ? <span className="font-medium text-warning">{formatQty(i.pendingQty, i.material.unit)}</span> : "—") },
            { id: "rate", header: "Rate", align: "right", cell: (i) => <MoneyText paisa={i.ratePaisa} /> },
            { id: "amount", header: "Amount", align: "right", cell: (i) => <MoneyText paisa={i.amountPaisa} /> },
          ]}
        />
      </SectionCard>
      <SectionCard title="Purchases against this order" flush>
        <DataTable
          rows={order.purchases}
          getRowId={(p) => p.id}
          clientPageSize={0}
          onRowClick={(p) => router.push(`/suppliers-stock/purchases/${p.id}`)}
          empty={{ title: "Nothing received yet", compact: true }}
          columns={[
            { id: "number", header: "Purchase", cell: (p) => <span className="font-medium tabular">{p.number}</span> },
            { id: "challan", header: "Challan", cell: (p) => p.challanNo },
            { id: "date", header: "Date", cell: (p) => formatDate(p.purchaseDate) },
            { id: "status", header: "Status", cell: (p) => <StatusBadge domain="purchase" value={p.status} /> },
          ]}
        />
      </SectionCard>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${order.number}?`}
        description="The supplier order is closed. Nothing has been received against it."
        confirmLabel="Cancel order"
        loading={isLoading}
        onConfirm={async () => {
          const ok = await run(() => cancel(order.id).unwrap(), { success: `${order.number} cancelled` });
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
      ? await run(() => update({ id: order.id, body: { items, expectedDate: v.expectedDate || null, note: v.note || null } }).unwrap(), { success: `${order.number} saved`, setError: form.setError })
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
          { success: (o) => `${o.number} created`, setError: form.setError },
        );
    if (result) router.push(`${BASE}/${result.id}`);
  };

  return (
    <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
      <SectionCard title="Supplier & delivery">
        <div className="space-y-4">
          <FieldGrid>
            <ComboboxField name="supplierId" label="Supplier" required options={suppliers.options} loading={suppliers.loading} disabled={Boolean(order)} />
            <DateField name="expectedDate" label="Expected by" />
          </FieldGrid>
          <SegmentedField<DeliverTo>
            name="deliverTo"
            label="Deliver to"
            disabled={Boolean(order)}
            options={[
              { value: "STORE", label: "Central Store" },
              { value: "SITE", label: "Directly to site" },
            ]}
          />
          {deliverTo === "SITE" ? <ComboboxField name="projectId" label="Project site" required options={projects.options} loading={projects.loading} disabled={Boolean(order)} /> : null}
        </div>
      </SectionCard>
      <SectionCard title="Materials">
        <LineItemsEditor
          name="items"
          emptyRow={emptyLine}
          columns={[
            { key: "orderedQty", label: "Quantity", kind: "quantity", required: true, width: "w-40" },
            { key: "ratePaisa", label: "Rate", kind: "money", required: true, width: "w-40" },
          ]}
          amount={{ qtyKey: "orderedQty", rateKey: "ratePaisa" }}
          onMaterialChange={(index, material) => {
            const rate = material ? agreed.get(material.id) : undefined;
            if (rate && !form.getValues(`items.${index}.ratePaisa`)) form.setValue(`items.${index}.ratePaisa`, rate);
          }}
        />
      </SectionCard>
      <SectionCard>
        <TextareaField name="note" label="Note" rows={2} />
      </SectionCard>
      <FormActions formId={FORM_ID} submitLabel={order ? "Save order" : "Create order"} loading={creating || updating} onCancel={() => router.push(order ? `${BASE}/${order.id}` : BASE)} />
    </Form>
  );
}

export function PurchaseOrderFormView({ orderId }: { orderId?: string }) {
  const query = useGetPurchaseOrderQuery(orderId ?? "", { skip: !orderId });
  const header = (title: string, crumbs: Array<{ label: string; href?: string }>) => <PageHeader title={title} breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Purchase Orders", href: BASE }, ...crumbs]} />;
  if (!orderId) {
    return (
      <>
        {header("New purchase order", [{ label: "New" }])}
        <OrderForm />
      </>
    );
  }
  return (
    <QueryState query={query}>
      {(order) => (
        <>
          {header(`Edit ${order.number}`, [{ label: order.number, href: `${BASE}/${order.id}` }, { label: "Edit" }])}
          <OrderForm order={order} />
        </>
      )}
    </QueryState>
  );
}
