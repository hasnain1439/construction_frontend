/**
 * Cache tag conventions
 * ─────────────────────
 * - A list query provides `{ type, id: "LIST" }` plus one tag per row (`providesList`).
 * - A detail query provides `{ type, id }`.
 * - Create → invalidates `LIST`. Update / status change → invalidates `{ type, id }` and `LIST`.
 * - Delete → invalidates `LIST` (the row's own tag disappears with it).
 */
export const COMPANY_TAGS = [
  "Me",
  "Sessions",
  "Company",
  "CompanySettings",
  "Holidays",
  "Users",
  "Invitations",
  "Devices",
  "Subscription",
  "SubscriptionPlans",
  "SubscriptionPayments",
  "MaterialGroups",
  "Materials",
  "QualityCategories",
  "PriceList",
  "RateHistory",
  "LaborRates",
  "PaymentTemplates",
  "Suppliers",
  "SupplierRates",
  "Workers",
  "Subcontractors",
  "Clients",
  "Projects",
  "ProjectReview",
  "Floors",
  "SupplyPresets",
  "StockLocations",
  "Stock",
  "Purchase",
  "PurchaseOrder",
  "PurchaseReturn",
  "SupplierLedger",
  "SupplierPayment",
  "Dispatch",
  "Shortage",
  "Usage",
  "StockCount",
  "Incoming",
  "OwnerDelivery",
  "ProjectWorkers",
  "Subcontracts",
  "Attendance",
  "Measurements",
  "Advances",
  "Settlements",
  "SubcontractAccounts",
  "CashAccounts",
  "CashEntries",
  "Topups",
  "CashCounts",
] as const;

export const ADMIN_TAGS = [
  "AdminMe",
  "AdminOverview",
  "AdminHealth",
  "Tenants",
  "AdminPayments",
  "AdminPlans",
  "AdminHolidays",
  "AuditLogs",
  "CatalogGroups",
  "CatalogMaterials",
] as const;

export type CompanyTag = (typeof COMPANY_TAGS)[number];
export type AdminTag = (typeof ADMIN_TAGS)[number];

export const LIST = "LIST" as const;

/** `[{type, id: "LIST"}, ...rows.map(r => ({type, id: r.id}))]` */
export function providesList<T extends string>(rows: ReadonlyArray<{ id: string }> | undefined, type: T) {
  return rows
    ? [{ type, id: LIST }, ...rows.map((row) => ({ type, id: row.id }))]
    : [{ type, id: LIST }];
}
