import type { ReportName } from "@/api/types";
import type { TranslationKey } from "@/i18n/useT";
import type { AccessRule } from "@/lib/permissions";

/** The seven reports: title, who may open them and which filters apply (shared by the page and the view). */
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

export const REPORTS: Record<ReportName, ReportDef> = {
  "project-summary": { name: "project-summary", titleKey: "billing.reports.projectSummary", descriptionKey: "billing.reports.projectSummaryDesc", access: { allPermissions: ["finance.reports.view", "fields.amounts"] }, project: true, dates: false },
  "material-audit": { name: "material-audit", titleKey: "billing.reports.materialAudit", descriptionKey: "billing.reports.materialAuditDesc", access: OFFICE, project: true, dates: true, dateLabelKey: "field.allTime" },
  "labor-peshgi": { name: "labor-peshgi", titleKey: "billing.reports.laborPeshgi", descriptionKey: "billing.reports.laborPeshgiDesc", access: OFFICE, project: true, dates: true, dateLabelKey: "field.allTime" },
  "cash-book": { name: "cash-book", titleKey: "billing.reports.cashBook", descriptionKey: "billing.reports.cashBookDesc", access: OFFICE, project: true, dates: true, dateLabelKey: "field.allTime" },
  "supplier-ageing": { name: "supplier-ageing", titleKey: "billing.reports.supplierAgeing", descriptionKey: "billing.reports.supplierAgeingDesc", access: OWNER, project: false, dates: false },
  "receivables-ageing": { name: "receivables-ageing", titleKey: "billing.reports.receivablesAgeing", descriptionKey: "billing.reports.receivablesAgeingDesc", access: OWNER, project: true, dates: false },
  "stock-valuation": { name: "stock-valuation", titleKey: "billing.reports.stockValuation", descriptionKey: "billing.reports.stockValuationDesc", access: OWNER, project: true, dates: false },
};

export const isReportName = (v: string): v is ReportName => v in REPORTS;
