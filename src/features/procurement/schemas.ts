/**
 * Form rules for procurement & inventory, mirroring the backend so most mistakes are
 * caught before saving. Quantities are decimal strings, money paisa strings.
 */
import { z } from "zod";
import type { UploadedFile } from "@/components/common/FileUpload";
import { qtyDiff } from "@/lib/quantity";
import { msg } from "@/i18n/message";
import { requiredText } from "@/lib/validation";

const qty = z.string().nullable();
const paisa = z.string().nullable();
const file = z.custom<UploadedFile | null>().nullable();

const material = z.string().nullable().refine((v): v is string => Boolean(v), msg("procurement.v.chooseMaterial"));
const requiredQty = (message = msg("procurement.v.qtyMoreThanZero")) => qty.refine((v): v is string => v !== null && Number(v) > 0, message);

/** Each line: material chosen, quantity > 0; no material twice. */
function noDuplicates(items: Array<{ materialId: string | null }>, ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (!item.materialId) return;
    if (seen.has(item.materialId)) ctx.addIssue({ code: "custom", path: [i, "materialId"], message: msg("procurement.v.alreadyOnLine") });
    seen.add(item.materialId);
  });
}

// ─── Purchase ───────────────────────────────────────────────────────────────

export const purchaseLineSchema = z.object({
  materialId: material,
  challanQty: requiredQty(msg("procurement.v.challanQtyMoreThanZero")),
  countedQty: qty,
  damagedQty: qty,
  ratePaisa: paisa,
  note: z.string().trim().max(500),
});

export const purchaseSchema = z
  .object({
    supplierId: z.string().nullable().refine((v): v is string => Boolean(v), msg("procurement.v.chooseSupplier")),
    deliverTo: z.enum(["STORE", "SITE"]),
    projectId: z.string().nullable(),
    purchaseOrderId: z.string().nullable(),
    purchaseDate: z.string().min(1, msg("validation.enterDate")),
    challanNo: requiredText("procurement.field.challanNumber", 1, 40),
    vehicleNo: z.string().trim().max(20),
    items: z.array(purchaseLineSchema).min(1, msg("procurement.v.addMaterial")).superRefine(noDuplicates),
    paymentMode: z.enum(["UDHAAR", "CASH", "PARTIAL"]),
    paidNowPaisa: paisa,
    paidFrom: z.string().nullable(),
    challan: file.refine((f) => Boolean(f), msg("procurement.v.uploadChallan")),
    bill: file,
    note: z.string().trim().max(500),
    /** MUNSHI entries carry no rates or payment. */
    withRates: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.deliverTo === "SITE" && !v.projectId) ctx.addIssue({ code: "custom", path: ["projectId"], message: msg("procurement.v.chooseProjectSite") });
    if (!v.withRates) return;
    v.items.forEach((item, i) => {
      if (!item.ratePaisa) ctx.addIssue({ code: "custom", path: ["items", i, "ratePaisa"], message: msg("procurement.v.enterRate") });
      // Counted on arrival (store): short or damaged lines need a note.
      if (v.deliverTo === "STORE") {
        const counted = item.countedQty ?? item.challanQty;
        const good = qtyDiff(counted, item.damagedQty ?? "0");
        const damagedOver = qtyDiff(item.damagedQty ?? "0", counted);
        if (damagedOver !== null && damagedOver > 0) ctx.addIssue({ code: "custom", path: ["items", i, "damagedQty"], message: msg("procurement.v.moreThanCounted") });
        if (good !== null && item.challanQty && good < Number(item.challanQty) && !item.note) {
          ctx.addIssue({ code: "custom", path: ["items", i, "note"], message: msg("procurement.v.sayWhatHappened") });
        }
      }
    });
    if (v.paymentMode !== "UDHAAR" && !v.paidFrom) ctx.addIssue({ code: "custom", path: ["paidFrom"], message: msg("procurement.v.choosePaidFrom") });
    if (v.paymentMode === "PARTIAL" && !v.paidNowPaisa) ctx.addIssue({ code: "custom", path: ["paidNowPaisa"], message: msg("procurement.v.enterPaidNow") });
  });

export type PurchaseValues = z.input<typeof purchaseSchema>;

// ─── Purchase order ─────────────────────────────────────────────────────────

export const purchaseOrderSchema = z
  .object({
    supplierId: z.string().nullable().refine((v): v is string => Boolean(v), msg("procurement.v.chooseSupplier")),
    deliverTo: z.enum(["STORE", "SITE"]),
    projectId: z.string().nullable(),
    expectedDate: z.string(),
    note: z.string().trim().max(500),
    items: z
      .array(z.object({ materialId: material, orderedQty: requiredQty(), ratePaisa: paisa.refine((v): v is string => Boolean(v), msg("procurement.v.enterRate")) }))
      .min(1, msg("procurement.v.addMaterial"))
      .superRefine(noDuplicates),
  })
  .superRefine((v, ctx) => {
    if (v.deliverTo === "SITE" && !v.projectId) ctx.addIssue({ code: "custom", path: ["projectId"], message: msg("procurement.v.chooseProjectSite") });
  });

export type PurchaseOrderValues = z.input<typeof purchaseOrderSchema>;

// ─── Return / rates / correction ────────────────────────────────────────────

export const returnSchema = z.object({
  reason: requiredText("field.reason", 3, 300),
  note: z.string().trim().max(500),
  attachment: file,
  items: z
    .array(z.object({ materialId: material, material: z.any().optional(), qty }))
    .refine((items) => items.some((i) => i.qty && Number(i.qty) > 0), msg("procurement.v.enterReturnQty")),
});
export type ReturnValues = z.input<typeof returnSchema>;

export const ratesSchema = z
  .object({
    items: z.array(z.object({ materialId: material, material: z.any().optional(), ratePaisa: paisa.refine((v): v is string => Boolean(v), msg("procurement.v.enterRate")) })),
    paymentMode: z.enum(["UDHAAR", "CASH", "PARTIAL"]),
    paidNowPaisa: paisa,
    paidFrom: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMode !== "UDHAAR" && !v.paidFrom) ctx.addIssue({ code: "custom", path: ["paidFrom"], message: msg("procurement.v.choosePaidFrom") });
    if (v.paymentMode === "PARTIAL" && !v.paidNowPaisa) ctx.addIssue({ code: "custom", path: ["paidNowPaisa"], message: msg("procurement.v.enterPaidNow") });
  });
export type RatesValues = z.input<typeof ratesSchema>;

export const correctionSchema = z.object({
  reason: requiredText("field.reason", 3, 500),
  items: z
    .array(z.object({ purchaseItemId: z.string(), materialId: z.string(), material: z.any().optional(), qty, ratePaisa: paisa, currentQty: z.number(), currentRatePaisa: z.string() }))
    .refine((items) => items.some((i) => (i.qty !== null && Number(i.qty) !== i.currentQty) || (i.ratePaisa !== null && i.ratePaisa !== i.currentRatePaisa)), msg("procurement.v.changeOne")),
});
export type CorrectionValues = z.input<typeof correctionSchema>;

// ─── Supplier payment ───────────────────────────────────────────────────────

export const paymentSchema = z
  .object({
    supplierId: z.string().nullable().refine((v): v is string => Boolean(v), msg("procurement.v.chooseSupplier")),
    amountPaisa: paisa.refine((v): v is string => Boolean(v) && v !== "0", msg("procurement.v.enterAmount")),
    method: z.enum(["CASH", "BANK", "CHEQUE", "JAZZCASH", "EASYPAISA"]),
    paidOn: z.string().min(1, msg("validation.enterDate")),
    reference: z.string().trim().max(60),
    chequeNo: z.string().trim().max(30),
    chequeDate: z.string(),
    note: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.method === "CHEQUE" && !v.chequeNo) ctx.addIssue({ code: "custom", path: ["chequeNo"], message: msg("procurement.v.enterChequeNo") });
  });
export type PaymentValues = z.input<typeof paymentSchema>;

// ─── Dispatch / receive / resolve ───────────────────────────────────────────

export const dispatchSchema = z.object({
  fromLocationId: z.string().nullable().refine((v): v is string => Boolean(v), msg("procurement.v.chooseFrom")),
  toProjectId: z.string().nullable().refine((v): v is string => Boolean(v), msg("procurement.v.chooseSite")),
  vehicleNo: z.string().trim().max(20),
  driverName: z.string().trim().max(60),
  driverPhone: z.string().trim(),
  note: z.string().trim().max(500),
  loadPhoto: file,
  items: z.array(z.object({ materialId: material, qty: requiredQty() })).min(1, msg("procurement.v.addMaterial")).superRefine(noDuplicates),
});
export type DispatchValues = z.input<typeof dispatchSchema>;

/** Receive: counted for every line; good < expected needs a note (expected only known to the office). */
export const receiveSchema = z.object({
  note: z.string().trim().max(500),
  items: z.array(
    z
      .object({
        materialId: z.string(),
        material: z.any().optional(),
        receivedQty: qty.refine((v): v is string => v !== null, msg("procurement.v.enterCounted")),
        damagedQty: qty,
        note: z.string().trim().max(500),
        photo: file,
      })
      .superRefine((item, ctx) => {
        const over = qtyDiff(item.damagedQty ?? "0", item.receivedQty ?? "0");
        if (over !== null && over > 0) ctx.addIssue({ code: "custom", path: ["damagedQty"], message: msg("procurement.v.moreThanReceived") });
      }),
  ),
});
export type ReceiveValues = z.input<typeof receiveSchema>;

export const resolveSchema = z
  .object({
    resolution: z.enum(["SEND_REMAINING", "RETURN_TO_STORE", "ACCEPT_LOSS", "RECOVER_FROM_DRIVER", "SUPPLIER_CREDIT"]).nullable(),
    note: requiredText("field.note", 3, 500),
    recoveredAmountPaisa: paisa,
  })
  .superRefine((v, ctx) => {
    if (!v.resolution) ctx.addIssue({ code: "custom", path: ["resolution"], message: msg("procurement.v.chooseDecision") });
    if (v.resolution === "RECOVER_FROM_DRIVER" && !v.recoveredAmountPaisa) ctx.addIssue({ code: "custom", path: ["recoveredAmountPaisa"], message: msg("procurement.v.enterRecovered") });
  });
export type ResolveValues = z.input<typeof resolveSchema>;

// ─── Usage / count / owner delivery ─────────────────────────────────────────

export const usageSchema = z.object({
  usageDate: z.string().min(1, msg("validation.enterDate")),
  note: z.string().trim().max(500),
  items: z.array(z.object({ materialId: material, qty: requiredQty() })).min(1, msg("procurement.v.addMaterial")).superRefine(noDuplicates),
});
export type UsageValues = z.input<typeof usageSchema>;

export const countSchema = z.object({
  note: z.string().trim().max(500),
  items: z
    .array(z.object({ materialId: material, material: z.any().optional(), countedQty: qty.refine((v): v is string => v !== null, msg("procurement.v.enterCount")), reason: z.string().nullable(), note: z.string().trim().max(500) }))
    .min(1, msg("procurement.v.addMaterial"))
    .superRefine(noDuplicates),
});
export type CountValues = z.input<typeof countSchema>;

export const ownerDeliverySchema = z.object({
  deliveryDate: z.string().min(1, msg("validation.enterDate")),
  note: z.string().trim().max(500),
  photo: file,
  items: z.array(z.object({ materialId: material, qty: requiredQty() })).min(1, msg("procurement.v.addMaterial")).superRefine(noDuplicates),
});
export type OwnerDeliveryValues = z.input<typeof ownerDeliverySchema>;
