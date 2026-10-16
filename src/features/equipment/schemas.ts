/**
 * Form rules for equipment & shuttering, mirroring the API (PHASE_2_3_CONTRACTS.md → Step 16) so
 * most mistakes are caught before saving. Quantities are decimal strings, money paisa strings.
 */
import { z } from "zod";
import type { UploadedFile } from "@/components/common/FileUpload";
import { msg } from "@/i18n/message";
import { qtyDiff } from "@/lib/quantity";
import { requiredText } from "@/lib/validation";

const qty = z.string().nullable();
const paisa = z.string().nullable();
const file = z.custom<UploadedFile | null>().nullable();
const pick = (key: Parameters<typeof msg>[0]) =>
  z
    .string()
    .nullable()
    .refine((v): v is string => Boolean(v), msg(key));
const positiveQty = qty.refine(
  (v): v is string => v !== null && Number(v) > 0,
  msg("equipment.v.qtyMoreThanZero"),
);
const date = z.string().min(1, msg("validation.enterDate"));

/** No pile (equipment + rental) twice on one document. */
const noDuplicates =
  <F extends string>(field: F) =>
  (items: Array<Record<F, string | null>>, ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    items.forEach((item, i) => {
      const value = item[field];
      if (!value) return;
      if (seen.has(value))
        ctx.addIssue({ code: "custom", path: [i, field], message: msg("equipment.v.alreadyOnLine") });
      seen.add(value);
    });
  };

// ─── Register ───────────────────────────────────────────────────────────────

export const equipmentSchema = z.object({
  name: requiredText("equipment.field.name", 2, 120),
  code: z.string().trim().max(30),
  kind: z.enum(["MACHINE", "BULK"]),
  category: z.enum([
    "SHUTTERING_PLATE",
    "PROP",
    "SCAFFOLDING",
    "MIXER",
    "VIBRATOR",
    "GENERATOR",
    "PUMP",
    "TOOL",
    "OTHER",
  ]),
  unit: z.string().trim().max(20),
  serialNo: z.string().trim().max(60),
  hireRatePaisaPerDay: paisa,
  replacementValuePaisa: paisa,
  coverageSqftPerUnit: z.number().nullable(),
  notes: z.string().trim().max(500),
  isActive: z.boolean(),
});
export type EquipmentValues = z.input<typeof equipmentSchema>;

export const stockInSchema = z
  .object({
    type: z.enum(["OPENING", "PURCHASE"]),
    where: z.enum(["YARD", "SITE"]),
    projectId: z.string().nullable(),
    qty: positiveQty,
    date,
    note: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.where === "SITE" && !v.projectId)
      ctx.addIssue({ code: "custom", path: ["projectId"], message: msg("equipment.v.chooseProject") });
  });
export type StockInValues = z.input<typeof stockInSchema>;

export const adjustSchema = z.object({
  locationId: pick("equipment.v.chooseLocation"),
  direction: z.enum(["OUT", "IN"]),
  qty: positiveQty,
  reason: requiredText("field.reason", 3, 500),
  date,
});
export type AdjustValues = z.input<typeof adjustSchema>;

// ─── Transfers ──────────────────────────────────────────────────────────────

export const lineSchema = z.object({ key: pick("equipment.v.chooseEquipment"), qty: positiveQty });

export const transferSchema = z.object({
  fromLocationId: pick("equipment.v.chooseFrom"),
  to: pick("equipment.v.chooseTo"),
  date,
  vehicleNo: z.string().trim().max(20),
  driverName: z.string().trim().max(80),
  note: z.string().trim().max(500),
  items: z.array(lineSchema).min(1, msg("equipment.v.addItem")).superRefine(noDuplicates("key")),
});
export type TransferValues = z.input<typeof transferSchema>;

/** Receiving with counts: short or damaged lines need a note (the API refuses them otherwise). */
export const receiveSchema = z.object({
  date,
  note: z.string().trim().max(500),
  items: z
    .array(
      z.object({
        itemId: z.string(),
        sentQty: z.number().nullable(),
        receivedQty: qty.refine(
          (v): v is string => v !== null && Number(v) >= 0,
          msg("equipment.v.enterCount"),
        ),
        damagedQty: qty,
        note: z.string().trim().max(500),
        photo: file,
      }),
    )
    .superRefine((items, ctx) => {
      items.forEach((item, i) => {
        const received = Number(item.receivedQty ?? 0);
        const damaged = Number(item.damagedQty ?? 0);
        if (item.sentQty !== null && received > item.sentQty)
          ctx.addIssue({
            code: "custom",
            path: [i, "receivedQty"],
            message: msg("equipment.v.moreThanSent"),
          });
        const over = qtyDiff(item.damagedQty ?? "0", item.receivedQty ?? "0");
        if (over !== null && over > 0)
          ctx.addIssue({
            code: "custom",
            path: [i, "damagedQty"],
            message: msg("equipment.v.damagedMoreThanCounted"),
          });
        const short = item.sentQty !== null && received < item.sentQty;
        if ((short || damaged > 0) && !item.note)
          ctx.addIssue({ code: "custom", path: [i, "note"], message: msg("equipment.v.sayWhatHappened") });
      });
    }),
});
export type ReceiveValues = z.input<typeof receiveSchema>;

// ─── Rentals ────────────────────────────────────────────────────────────────

export const rentalSchema = z
  .object({
    supplierId: pick("equipment.v.chooseSupplier"),
    deliverTo: z.enum(["SITE", "YARD"]),
    projectId: z.string().nullable(),
    startDate: date,
    expectedEndDate: z.string(),
    depositPaisa: paisa,
    reference: z.string().trim().max(60),
    note: z.string().trim().max(500),
    items: z
      .array(
        z.object({
          equipmentId: pick("equipment.v.chooseEquipment"),
          qty: positiveQty,
          ratePaisaPerDay: paisa.refine(
            (v): v is string => v !== null && v !== "",
            msg("equipment.v.enterRate"),
          ),
        }),
      )
      .min(1, msg("equipment.v.addItem"))
      .superRefine(noDuplicates("equipmentId")),
  })
  .superRefine((v, ctx) => {
    if (v.deliverTo === "SITE" && !v.projectId)
      ctx.addIssue({ code: "custom", path: ["projectId"], message: msg("equipment.v.chooseProject") });
    if (v.expectedEndDate && v.expectedEndDate < v.startDate)
      ctx.addIssue({ code: "custom", path: ["expectedEndDate"], message: msg("equipment.v.endBeforeStart") });
  });
export type RentalValues = z.input<typeof rentalSchema>;

export const extendSchema = z.object({ expectedEndDate: date, note: z.string().trim().max(500) });
export type ExtendValues = z.input<typeof extendSchema>;

export const returnSchema = z.object({
  returnDate: date,
  damageChargesPaisa: paisa,
  note: z.string().trim().max(500),
  items: z
    .array(
      z.object({
        rentalItemId: z.string(),
        outstandingQty: z.number(),
        qty: qty,
        damagedQty: qty,
        missingQty: qty,
      }),
    )
    .superRefine((items, ctx) => {
      items.forEach((item, i) => {
        const back = Number(item.qty ?? 0) + Number(item.missingQty ?? 0);
        if (back > item.outstandingQty)
          ctx.addIssue({ code: "custom", path: [i, "qty"], message: msg("equipment.v.moreThanOutstanding") });
        if (Number(item.damagedQty ?? 0) > Number(item.qty ?? 0))
          ctx.addIssue({
            code: "custom",
            path: [i, "damagedQty"],
            message: msg("equipment.v.damagedMoreThanReturned"),
          });
      });
      if (items.every((i) => !Number(i.qty ?? 0) && !Number(i.missingQty ?? 0)))
        ctx.addIssue({ code: "custom", path: [0, "qty"], message: msg("equipment.v.returnSomething") });
    }),
});
export type ReturnValues = z.input<typeof returnSchema>;

export const closeSchema = z.object({ depositRefundPaisa: paisa, note: z.string().trim().max(500) });
export type CloseValues = z.input<typeof closeSchema>;

// ─── Losses ─────────────────────────────────────────────────────────────────

export const lossSchema = z.object({
  locationId: pick("equipment.v.chooseLocation"),
  key: pick("equipment.v.chooseEquipment"),
  kind: z.enum(["MISSING", "DAMAGED"]),
  qty: positiveQty,
  date,
  photo: file,
  note: requiredText("field.note", 3, 500),
});
export type LossValues = z.input<typeof lossSchema>;

export const chargeSchema = z
  .object({
    chargedTo: z.enum(["PROJECT", "SUBCONTRACTOR", "WRITE_OFF"]).nullable(),
    valuePaisa: paisa,
    subcontractAssignmentId: z.string().nullable(),
    note: requiredText("field.note", 3, 500),
  })
  .superRefine((v, ctx) => {
    if (!v.chargedTo)
      ctx.addIssue({ code: "custom", path: ["chargedTo"], message: msg("equipment.v.chooseChargeTo") });
    if (v.chargedTo === "SUBCONTRACTOR" && !v.subcontractAssignmentId)
      ctx.addIssue({
        code: "custom",
        path: ["subcontractAssignmentId"],
        message: msg("equipment.v.chooseSubcontractor"),
      });
  });
export type ChargeValues = z.input<typeof chargeSchema>;
