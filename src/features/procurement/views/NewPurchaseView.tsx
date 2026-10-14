"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useGetSupplierQuery } from "@/api/services/masterData.api";
import { useCreatePurchaseMutation, useGetPurchaseOrderQuery, useGetPurchaseOrdersQuery } from "@/api/services/procurement.api";
import type { CreatePurchaseBody, DeliverTo, PaidFrom, PaymentMode, PurchaseOrder } from "@/api/types";
import { LineItemsEditor, type LineColumn } from "@/components/common/LineItemsEditor";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { qtyTimesRate } from "@/lib/quantity";
import { useMe } from "@/store/hooks";
import { PaymentFields } from "../components/PaymentFields";
import { PurchaseSummaryCard } from "../components/PurchaseSummaryCard";
import { applyLineError } from "../lineErrors";
import { useSiteProjectOptions, useSupplierOptions } from "../options";
import { purchaseSchema, type PurchaseValues } from "../schemas";

const FORM_ID = "purchase-form";
type Line = PurchaseValues["items"][number];
const emptyLine = (): Line => ({ materialId: null, challanQty: null, countedQty: null, damagedQty: null, ratePaisa: null, note: "" });

/** Pending lines of a purchase order → purchase lines (challan = what is still to come). */
function linesFromOrder(po: PurchaseOrder): Line[] {
  const pending = po.items.filter((i) => i.pendingQty > 0);
  return (pending.length ? pending : po.items).map((i) => ({ ...emptyLine(), materialId: i.material.id, challanQty: String(i.pendingQty || i.orderedQty), ratePaisa: i.ratePaisa }));
}

/**
 * New purchase (challan). Office: STORE (counted now → saved) or straight to a SITE (the
 * site counts it on receipt), with rates + payment. MUNSHI: site only, no rates or payment
 * (the office prices it later). `fixedProjectId` locks the site (project-mode entry).
 */
export function NewPurchaseView({ fixedProjectId, backHref = "/suppliers-stock/purchases" }: { fixedProjectId?: string; backHref?: string }) {
  const t = useT();
  const te = useEnumT();
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  const munshi = me?.user.role === "MUNSHI";
  const withRates = !munshi;
  const [create, { isLoading }] = useCreatePurchaseMutation();
  const run = useMutationToast();
  const suppliers = useSupplierOptions();
  const projects = useSiteProjectOptions();
  const initialPo = params.get("po");
  const initialProject = fixedProjectId ?? params.get("projectId");

  const form = useForm<PurchaseValues, unknown, z.output<typeof purchaseSchema>>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: null,
      deliverTo: munshi || initialProject ? "SITE" : "STORE",
      projectId: initialProject,
      purchaseOrderId: initialPo,
      purchaseDate: todayPK(),
      challanNo: "",
      vehicleNo: "",
      items: [emptyLine()],
      paymentMode: "UDHAAR",
      paidNowPaisa: null,
      paidFrom: null,
      challan: null,
      bill: null,
      note: "",
      withRates,
    },
  });
  const [supplierId, deliverTo, purchaseOrderId, items, paymentMode, paidNowPaisa] = useWatch({
    control: form.control,
    name: ["supplierId", "deliverTo", "purchaseOrderId", "items", "paymentMode", "paidNowPaisa"],
  });

  const supplier = useGetSupplierQuery(supplierId ?? "", { skip: !supplierId });
  const agreed = useMemo(() => new Map((supplier.data?.rates ?? []).map((r) => [r.material.id, r.ratePaisa])), [supplier.data]);
  const orders = useGetPurchaseOrdersQuery({ supplierId: supplierId ?? undefined, limit: 50 }, { skip: !supplierId || munshi });
  const orderOptions = (orders.data?.items ?? [])
    .filter((o) => o.status === "OPEN" || o.status === "PARTLY_RECEIVED")
    .map((o) => ({ value: o.id, label: o.number, description: t("procurement.newPurchase.orderDesc", { n: o.items.length, place: o.deliverTo === "STORE" ? t("procurement.common.store") : (o.project?.name ?? t("procurement.common.site")) }) }));

  // A linked order fills in the supplier, destination and lines once.
  const po = useGetPurchaseOrderQuery(purchaseOrderId ?? "", { skip: !purchaseOrderId });
  const [appliedPo, setAppliedPo] = useState<string | null>(null);
  if (po.data && appliedPo !== po.data.id) {
    setAppliedPo(po.data.id);
    form.setValue("supplierId", po.data.supplier.id);
    form.setValue("deliverTo", po.data.deliverTo);
    form.setValue("projectId", po.data.project?.id ?? null);
    form.setValue("items", linesFromOrder(po.data));
  }

  const total = withRates ? (items ?? []).reduce((sum, l) => sum + BigInt(qtyTimesRate(l.challanQty, l.ratePaisa) ?? "0"), BigInt(0)).toString() : "0";
  const paidNow = paymentMode === "CASH" ? total : paymentMode === "PARTIAL" ? (paidNowPaisa ?? "0") : "0";

  const storeCount = deliverTo === "STORE" || munshi;
  const columns: LineColumn[] = [
    { key: "challanQty", label: t("procurement.newPurchase.challanQty"), kind: "quantity", required: true, width: "w-36" },
    ...(storeCount
      ? ([
          { key: "countedQty", label: t("field.counted"), kind: "quantity", placeholder: t("procurement.newPurchase.countedPlaceholder"), width: "w-32" },
          { key: "damagedQty", label: t("field.damaged"), kind: "quantity", width: "w-28" },
        ] as LineColumn[])
      : []),
    ...(withRates ? ([{ key: "ratePaisa", label: t("field.rate"), kind: "money", required: true, width: "w-36" }] as LineColumn[]) : []),
    { key: "note", label: t("field.note"), kind: "text", placeholder: storeCount ? t("procurement.newPurchase.notePlaceholderStore") : t("common.optional"), width: "w-48" },
  ];

  const onSubmit = async (v: z.output<typeof purchaseSchema>) => {
    const body: CreatePurchaseBody = {
      supplierId: v.supplierId,
      deliverTo: v.deliverTo as DeliverTo,
      ...(v.projectId && v.deliverTo === "SITE" ? { projectId: v.projectId } : {}),
      ...(v.purchaseOrderId ? { purchaseOrderId: v.purchaseOrderId } : {}),
      challanNo: v.challanNo,
      ...(v.vehicleNo ? { vehicleNo: v.vehicleNo } : {}),
      purchaseDate: v.purchaseDate,
      challanAttachmentId: v.challan!.id,
      ...(v.bill ? { billAttachmentId: v.bill.id } : {}),
      ...(v.note ? { note: v.note } : {}),
      ...(withRates
        ? {
            paymentMode: v.paymentMode as PaymentMode,
            ...(v.paymentMode === "PARTIAL" && v.paidNowPaisa ? { paidNowPaisa: v.paidNowPaisa } : {}),
            ...(v.paymentMode !== "UDHAAR" && v.paidFrom ? { paidFrom: v.paidFrom as PaidFrom } : {}),
          }
        : {}),
      items: v.items.map((l) => ({
        materialId: l.materialId,
        challanQty: l.challanQty,
        ...(storeCount && l.countedQty ? { countedQty: l.countedQty } : {}),
        ...(storeCount && l.damagedQty ? { damagedQty: l.damagedQty } : {}),
        ...(withRates && l.ratePaisa ? { ratePaisa: l.ratePaisa } : {}),
        ...(l.note ? { note: l.note } : {}),
      })),
    };
    const result = await run(() => create(body).unwrap(), {
      success: (p) => t("procurement.common.saved", { number: p.number }),
      setError: form.setError,
      codeFields: { INVALID_PAID_AMOUNT: "paidNowPaisa", CHALLAN_REQUIRED: "challan", PO_SUPPLIER_MISMATCH: "purchaseOrderId", SUPPLIER_INACTIVE: "supplierId" },
      onError: (_code, error) =>
        applyLineError(error, v.items, form.setError, "items", {
          SHORTAGE_NOTE_REQUIRED: "note",
          RATE_REQUIRED: "ratePaisa",
          DAMAGED_EXCEEDS_COUNTED: "damagedQty",
          INVALID_MATERIAL: "materialId",
        }),
    });
    if (result) router.push(fixedProjectId ? backHref : `/suppliers-stock/purchases/${result.id}`);
  };

  return (
    <>
      <PageHeader
        title={munshi ? t("procurement.newPurchase.titleMunshi") : t("procurement.newPurchase.title")}
        description={munshi ? t("procurement.newPurchase.descMunshi") : t("procurement.newPurchase.desc")}
        breadcrumbs={fixedProjectId ? undefined : [{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.purchases"), href: "/suppliers-stock/purchases" }, { label: t("procurement.common.new") }]}
      />
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <SectionCard title={t("procurement.common.supplierAndDelivery")}>
              <div className="space-y-4">
                <FieldGrid>
                  <ComboboxField name="supplierId" label={t("field.supplier")} required options={suppliers.options} loading={suppliers.loading} placeholder={t("procurement.newPurchase.chooseSupplier")} />
                  {withRates ? (
                    <ComboboxField
                      name="purchaseOrderId"
                      label={t("procurement.common.purchaseOrder")}
                      options={orderOptions}
                      loading={orders.isLoading}
                      placeholder={supplierId ? (orderOptions.length ? t("procurement.newPurchase.linkOrder") : t("procurement.newPurchase.noOpenOrders")) : t("procurement.newPurchase.supplierFirst")}
                      disabled={!supplierId}
                    />
                  ) : null}
                </FieldGrid>
                {!munshi && !fixedProjectId ? (
                  <SegmentedField<DeliverTo>
                    name="deliverTo"
                    label={t("procurement.common.deliverTo")}
                    options={(["STORE", "SITE"] as const).map((value) => ({ value, label: te("procDeliverTo", value) }))}
                  />
                ) : null}
                {deliverTo === "SITE" && !fixedProjectId ? (
                  <ComboboxField name="projectId" label={t("procurement.common.projectSite")} required options={projects.options} loading={projects.loading} placeholder={t("procurement.newPurchase.chooseSite")} />
                ) : null}
                <FieldGrid columns={3}>
                  <DateField name="purchaseDate" label={t("field.date")} required max={todayPK()} />
                  <TextField name="challanNo" label={t("procurement.common.challanNo")} required placeholder={t("procurement.common.challanPlaceholder")} />
                  <TextField name="vehicleNo" label={t("procurement.common.vehicleNo")} placeholder={t("procurement.common.vehiclePlaceholder")} />
                </FieldGrid>
              </div>
            </SectionCard>

            <SectionCard
              title={t("field.materials")}
              description={storeCount ? t("procurement.newPurchase.materialsDescStore") : t("procurement.newPurchase.materialsDescSite")}
            >
              <LineItemsEditor
                name="items"
                columns={columns}
                emptyRow={emptyLine}
                amount={withRates ? { qtyKey: "challanQty", rateKey: "ratePaisa", label: t("field.amount") } : undefined}
                onMaterialChange={(index, material) => {
                  const rate = material ? agreed.get(material.id) : undefined;
                  if (withRates && rate && !form.getValues(`items.${index}.ratePaisa`)) form.setValue(`items.${index}.ratePaisa`, rate);
                }}
                info={(row) => (withRates && row.materialId && agreed.has(row.materialId) ? t("procurement.newPurchase.agreedRate") : null)}
              />
            </SectionCard>

            {withRates ? (
              <SectionCard title={t("field.payment")}>
                <PaymentFields />
              </SectionCard>
            ) : null}

            <SectionCard title={t("procurement.common.challanAndBill")}>
              <div className="space-y-4">
                <FieldGrid>
                  <AttachmentField name="challan" label={t("procurement.newPurchase.challanPhoto")} required kind="CHALLAN" uploadLabel={t("procurement.newPurchase.uploadChallan")} />
                  {withRates ? <AttachmentField name="bill" label={t("procurement.newPurchase.billOptional")} kind="RECEIPT" uploadLabel={t("procurement.newPurchase.uploadBill")} /> : null}
                </FieldGrid>
                <TextareaField name="note" label={t("field.note")} rows={2} />
              </div>
            </SectionCard>
          </div>

          {withRates ? (
            <PurchaseSummaryCard totalPaisa={total} paidNowPaisa={paidNow} supplierBalancePaisa={supplier.data?.udhaarBalancePaisa} lines={(items ?? []).length} />
          ) : (
            <div />
          )}
        </div>
        <FormActions formId={FORM_ID} submitLabel={munshi ? t("procurement.newPurchase.saveDelivery") : t("procurement.newPurchase.savePurchase")} loading={isLoading} onCancel={() => router.push(backHref)} className="sticky bottom-0 rounded-xl border bg-card p-3 shadow-card" />
      </Form>
    </>
  );
}
