import type { ReportName } from "@/api/types";
import type { AccessRule } from "@/lib/permissions";

/** The seven reports: title, who may open them and which filters apply (shared by the page and the view). */
export interface ReportDef {
  name: ReportName;
  title: string;
  description: string;
  access: AccessRule;
  /** Which filters apply. */
  project: boolean;
  dates: boolean;
  dateLabel?: string;
}

const OWNER: AccessRule = { roles: ["THEKEDAR"] };
const OFFICE: AccessRule = { roles: ["THEKEDAR", "PM"] };

export const REPORTS: Record<ReportName, ReportDef> = {
  "project-summary": { name: "project-summary", title: "Project Summary", description: "Contract, billed, received, cost by bucket and own money per project.", access: { roles: ["THEKEDAR", "PM"], permission: "billing.view" }, project: true, dates: false },
  "material-audit": { name: "material-audit", title: "Material Audit", description: "Delivered, used, sent away, adjusted and lost material per site — and what is in stock.", access: OFFICE, project: true, dates: true, dateLabel: "All time" },
  "labor-peshgi": { name: "labor-peshgi", title: "Labor & Peshgi", description: "Days, wages, peshgi and balances per worker and sub-contractor.", access: OFFICE, project: true, dates: true, dateLabel: "All time" },
  "cash-book": { name: "cash-book", title: "Cash Book", description: "Floats, kharcha by category and balances per holder and site.", access: OFFICE, project: true, dates: true, dateLabel: "All time" },
  "supplier-ageing": { name: "supplier-ageing", title: "Supplier Ageing", description: "Udhaar per supplier by age (oldest purchases are paid first).", access: OWNER, project: false, dates: false },
  "receivables-ageing": { name: "receivables-ageing", title: "Receivables Ageing", description: "What owners owe, by days since the invoice was issued.", access: OWNER, project: true, dates: false },
  "stock-valuation": { name: "stock-valuation", title: "Stock Valuation", description: "Store, sites and transit at weighted-average cost.", access: OWNER, project: true, dates: false },
};

export const isReportName = (v: string): v is ReportName => v in REPORTS;
