import type { ReportName, Step18ReportName } from "@/api/types";
import type { TranslationKey } from "@/i18n/useT";
import type { AccessRule } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permissionKeys";

/** The reports (seven Phase 1 + five Step 18 + two tax): title, who may open them and which filters apply (shared by the page and the view). */
export interface ReportDef {
  name: ReportName;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  access: AccessRule;
  /** Which filters apply. */
  project: boolean;
  dates: boolean;
  dateLabelKey?: TranslationKey;
}

/** Company-wide money reports (supplier ageing, receivables ageing, stock valuation). */
const OWNER: AccessRule = { allPermissions: ["finance.reports.view", "finance.companyreports.view"] };
const OFFICE: AccessRule = { permission: "finance.reports.view" };
const STEP18_NAMES: readonly Step18ReportName[] = ["delay-analysis", "variance", "change-orders", "equipment-utilisation", "snags"];
function step18(name: Step18ReportName, moduleKey: PermissionKey, dates: boolean): ReportDef {
  return { name, titleKey: `reports.title.${name}`, descriptionKey: `reports.desc.${name}`, access: { allPermissions: ["finance.reports.view", moduleKey] }, project: true, dates };
}
/** Step 18: tax reports — tax.view + money amounts (owner, Administrator, Accountant). */
const TAX: AccessRule = { allPermissions: ["tax.view", "fields.amounts"] };

export const REPORTS: Record<ReportName, ReportDef> = {
  "project-summary": { name: "project-summary", titleKey: "billing.reports.projectSummary", descriptionKey: "billing.reports.projectSummaryDesc", access: { allPermissions: ["finance.reports.view", "fields.amounts"] }, project: true, dates: false },
  "material-audit": { name: "material-audit", titleKey: "billing.reports.materialAudit", descriptionKey: "billing.reports.materialAuditDesc", access: OFFICE, project: true, dates: true, dateLabelKey: "field.allTime" },
  "labor-peshgi": { name: "labor-peshgi", titleKey: "billing.reports.laborPeshgi", descriptionKey: "billing.reports.laborPeshgiDesc", access: OFFICE, project: true, dates: true, dateLabelKey: "field.allTime" },
  "cash-book": { name: "cash-book", titleKey: "billing.reports.cashBook", descriptionKey: "billing.reports.cashBookDesc", access: OFFICE, project: true, dates: true, dateLabelKey: "field.allTime" },
  "supplier-ageing": { name: "supplier-ageing", titleKey: "billing.reports.supplierAgeing", descriptionKey: "billing.reports.supplierAgeingDesc", access: OWNER, project: false, dates: false },
  "receivables-ageing": { name: "receivables-ageing", titleKey: "billing.reports.receivablesAgeing", descriptionKey: "billing.reports.receivablesAgeingDesc", access: OWNER, project: true, dates: false },
  "stock-valuation": { name: "stock-valuation", titleKey: "billing.reports.stockValuation", descriptionKey: "billing.reports.stockValuationDesc", access: OWNER, project: true, dates: false },
  // Step 18: finance.reports.view + the source module's view key (its project scope)
  "delay-analysis": step18("delay-analysis", "control.view", false),
  variance: step18("variance", "control.view", false),
  "change-orders": step18("change-orders", "changeorder.view", true),
  "equipment-utilisation": step18("equipment-utilisation", "equipment.view", true),
  snags: step18("snags", "closeout.snag.view", true),
  // Step 18 · tax reports (default period: the current tax year, 1 July – 30 June)
  "wht-summary": { name: "wht-summary", titleKey: "tax.reports.whtSummary", descriptionKey: "tax.reports.whtSummaryDesc", access: TAX, project: true, dates: true, dateLabelKey: "tax.reports.thisTaxYear" },
  "tax-invoice-register": { name: "tax-invoice-register", titleKey: "tax.reports.register", descriptionKey: "tax.reports.registerDesc", access: TAX, project: true, dates: true, dateLabelKey: "tax.reports.thisTaxYear" },
};

/** Step 18 reports with a per-project book (shown under the table when a project is picked). */
export const BOOK_REPORTS: readonly Step18ReportName[] = ["delay-analysis", "variance", "snags"];
export const isStep18Report = (name: ReportName): name is Step18ReportName => STEP18_NAMES.includes(name as Step18ReportName);

export const isReportName = (v: string): v is ReportName => v in REPORTS;
