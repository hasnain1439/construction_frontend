import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReportBook, ReportTable } from "@/api/types";
import { ReportBookContent, ReportTableCard } from "@/features/reports/components/ReportParts";
import { isStep18Report, REPORTS } from "@/features/reports/reports.config";
import { ReportTableFor, ReportVisuals } from "@/features/reports/views/Step18ReportView";
import { COMPANY_NAV, visibleSections } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const base = { subtitle: "All projects · as of 16 Oct 2026", generatedAt: "2026-10-16T05:00:00.000Z", filters: { projectId: null, from: null, to: null } };
const col = (key: string, label: string, type: ReportTable["columns"][number]["type"] = "text") => ({ key, label, type });

const DELAY: ReportTable = {
  ...base,
  name: "delay-analysis",
  title: "Delay Analysis",
  columns: [col("code", "Code"), col("name", "Project"), col("status", "Status"), col("revisedEnd", "Revised end", "date"), col("ownerDays", "Owner days", "int"), col("excusableDays", "Excusable days", "int"), col("contractorDays", "Contractor days", "int"), col("changeOrderDays", "Change-order days", "int"), col("totalDays", "Total delay days", "int"), col("topReasons", "Top reasons")],
  rows: [{ code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla", status: "ACTIVE", revisedEnd: "2027-02-20", ownerDays: 0, excusableDays: 2, contractorDays: 6, changeOrderDays: 3, totalDays: 11, topReasons: "Slow progress 6 · Change order 3 · Rain 2" }],
  totals: { code: null, name: null, status: null, revisedEnd: null, ownerDays: 0, excusableDays: 2, contractorDays: 6, changeOrderDays: 3, totalDays: 11, topReasons: null },
  extra: {
    projects: [
      {
        projectId: "p1",
        code: "MSB-2026-012",
        categories: [
          { category: "OWNER", days: 3 },
          { category: "EXCUSABLE", days: 2 },
          { category: "CONTRACTOR", days: 6 },
        ],
        reasons: [
          { reason: "SLOW_PROGRESS", category: "CONTRACTOR", days: 6 },
          { reason: "CHANGE_ORDER", category: "OWNER", days: 3 },
          { reason: "RAIN", category: "EXCUSABLE", days: 2 },
        ],
      },
    ],
  },
};

const coRow = (code: string, coStatus: string, total: string | null, days: number, invoice: string | null) => ({ project: "MSB-2026-012", code, title: `Title ${code}`, coType: "ADDITION", coStatus, ...(total !== null ? { total } : {}), days, proofType: coStatus === "BILLED" ? "WHATSAPP_SCREENSHOT" : null, invoice, createdOn: "2026-10-04", approvedOn: null });
const changeOrders = (money: boolean): ReportTable => ({
  ...base,
  name: "change-orders",
  title: "Change Order Register",
  columns: [col("project", "Project"), col("code", "Code"), col("title", "Title"), col("coType", "Type"), col("coStatus", "Status"), ...(money ? [col("total", "Total", "money")] : []), col("days", "Days", "int"), col("proofType", "Proof"), col("invoice", "Billed on invoice")],
  rows: [coRow("CO-001", "BILLED", money ? "6567000" : null, 3, "INV-2026-0013"), coRow("CO-002", "SENT", money ? "4480000" : null, 1, null)],
  totals: { project: null, code: null, title: null, coType: null, coStatus: null, ...(money ? { total: "6567000" } : {}), days: 3, proofType: null, invoice: null },
  extra: { byStatus: { BILLED: 1, SENT: 1 }, approvedCount: 1, ...(money ? { approvedTotalPaisa: "6567000" } : {}) },
});

const EQUIPMENT: ReportTable = {
  ...base,
  name: "equipment-utilisation",
  title: "Equipment Utilisation",
  columns: [col("equipment", "Equipment"), col("category", "Category"), col("daysOnSite", "Days on site", "int"), col("daysIdle", "Days idle", "int"), col("utilisationPercent", "Utilisation", "percent"), col("rentedUnitDays", "Rented unit-days", "qty")],
  rows: [{ equipment: "Steel prop (adjustable 10–12 ft)", category: "PROP", daysOnSite: 30, daysIdle: 30, utilisationPercent: 60, rentedUnitDays: 3700 }],
  totals: null,
  extra: { from: "2026-09-17", to: "2026-10-16", days: 30 },
};

const SNAGS: ReportTable = {
  ...base,
  name: "snags",
  title: "Snag Summary",
  columns: [col("code", "Code"), col("total", "Snags", "int"), col("open", "Open", "int"), col("fixed", "Fixed", "int"), col("verified", "Verified", "int"), col("overdue", "Overdue", "int"), col("age_0-7", "0-7 days", "int"), col("defectPeriod", "Defect period", "int")],
  rows: [{ code: "MSB-2026-008", total: 4, open: 2, fixed: 1, verified: 1, overdue: 1, "age_0-7": 1, defectPeriod: 0 }],
  totals: { code: null, total: 4, open: 2, fixed: 1, verified: 1, overdue: 1, "age_0-7": 1, defectPeriod: 0 },
};

const BOOK: ReportBook = {
  name: "delay-analysis-project",
  title: "Delay Analysis",
  subtitle: "MSB-2026-012 DHA Phase 6 · as of 16 Oct 2026",
  generatedAt: "2026-10-16T05:00:00.000Z",
  filters: { projectId: "p1", from: null, to: null },
  project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla", status: "ACTIVE" },
  summary: [
    { key: "revisedEnd", label: "Revised end", type: "date", value: "2027-02-20" },
    { key: "totalDays", label: "Total delay days", type: "int", value: 11 },
  ],
  sections: [
    { key: "categories", title: "Delay by category", columns: [col("delayCategory", "Category"), col("days", "Days", "int"), col("reasons", "Reasons")], rows: [{ delayCategory: "EXCUSABLE", days: 2, reasons: "Rain 2" }], totals: null },
    {
      key: "stoppages",
      title: "Stoppages",
      columns: [col("from", "From", "date"), col("days", "Days", "int"), col("reason", "Reason"), col("delayCategory", "Category"), col("stoppageStatus", "Status")],
      rows: [
        { from: "2026-10-07", days: 2, reason: "RAIN", delayCategory: "EXCUSABLE", stoppageStatus: "APPROVED" },
        { from: "2026-10-14", days: 1, reason: "SMOG_BAN", delayCategory: "EXCUSABLE", stoppageStatus: "PENDING" },
      ],
      totals: { from: null, days: 2, reason: null, delayCategory: null, stoppageStatus: null },
    },
  ],
  extra: { categories: [{ category: "EXCUSABLE", days: 2 }], reasons: [{ reason: "RAIN", category: "EXCUSABLE", days: 2 }] },
};

describe("Step 18 reports — tables from fixtures", () => {
  it("delay analysis: translated headers, project status and the top reasons from the structured data", () => {
    renderWithStore(<ReportTableFor name="delay-analysis" report={DELAY} />, { me: meFixture("THEKEDAR") });
    const row = screen.getByText("MSB-2026-012").closest("tr")!;
    expect(within(row).getByText("Slow progress 6 · Change order 3 · Rain 2")).toBeInTheDocument();
    expect(screen.getAllByText("Change-order days").length).toBeGreaterThan(0);
  });

  it("delay analysis in Urdu: headers and reasons in Urdu, never the API's English", () => {
    renderWithStore(<ReportTableFor name="delay-analysis" report={DELAY} />, { me: meFixture("THEKEDAR"), ui: { language: "ur" } });
    expect(screen.getAllByText("کل تاخیر (دن)").length).toBeGreaterThan(0);
    expect(screen.getByText("کام کی سست رفتار 6 · تبدیلی آرڈر 3 · بارش 2")).toBeInTheDocument();
    expect(screen.queryByText("Total delay days")).not.toBeInTheDocument();
  });

  it("change order register: statuses / proof translated, rupees with the price permission, KPIs + status chart", () => {
    renderWithStore(
      <>
        <ReportVisuals name="change-orders" report={changeOrders(true)} />
        <ReportTableFor name="change-orders" report={changeOrders(true)} />
      </>,
      { me: meFixture("THEKEDAR") },
    );
    const row = screen.getByText("CO-001").closest("tr")!;
    expect(within(row).getByText("Billed")).toBeInTheDocument();
    expect(within(row).getByText("WhatsApp screenshot")).toBeInTheDocument();
    expect(row.textContent).toMatch(/Rs/);
    expect(screen.getByText("Approved value")).toBeInTheDocument();
    expect(screen.getByText("Change orders by status")).toBeInTheDocument();
  });

  it("change order register without money (columns left out by the API): no rupees anywhere", () => {
    renderWithStore(
      <>
        <ReportVisuals name="change-orders" report={changeOrders(false)} />
        <ReportTableFor name="change-orders" report={changeOrders(false)} />
      </>,
      { me: meFixture("PM", { deny: ["fields.rates"] }) },
    );
    expect(screen.queryByText(/Rs\s?\d/)).not.toBeInTheDocument();
    expect(screen.queryByText("Approved value")).not.toBeInTheDocument();
  });

  it("equipment utilisation and snags render with categories / ageing labels", () => {
    renderWithStore(
      <>
        <ReportTableFor name="equipment-utilisation" report={EQUIPMENT} />
        <ReportVisuals name="snags" report={SNAGS} />
        <ReportTableFor name="snags" report={SNAGS} />
      </>,
      { me: meFixture("THEKEDAR"), ui: { language: "roman-ur" } },
    );
    expect(screen.getByText("Props / balliyan")).toBeInTheDocument();
    expect(screen.getAllByText("0-7 din").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Khuli kamiyan").length).toBeGreaterThan(0);
  });

  it("project book: summary, sections, enum cells and reasons in the reader's language", () => {
    renderWithStore(<ReportBookContent book={BOOK} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Project report — MSB-2026-012")).toBeInTheDocument();
    expect(screen.getByText("Stoppages")).toBeInTheDocument();
    expect(screen.getByText("Waiting approval")).toBeInTheDocument();
    expect(screen.getByText("Smog ban")).toBeInTheDocument();
    const cat = screen.getByText("Delay by category").closest("section")!;
    expect(within(cat).getByText("Rain 2")).toBeInTheDocument();
  });

  it("totals line shows only numeric totals", () => {
    renderWithStore(<ReportTableCard title="x" columns={SNAGS.columns} rows={SNAGS.rows} totals={SNAGS.totals} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByLabelText("Totals")).toBeInTheDocument();
  });
});

describe("Step 18 reports — access", () => {
  it("each report needs finance.reports.view + its module key; the Munshi sees none", () => {
    const names = ["delay-analysis", "variance", "change-orders", "equipment-utilisation", "snags"] as const;
    for (const n of names) expect(isStep18Report(n)).toBe(true);
    expect(isStep18Report("cash-book")).toBe(false);
    const munshi = meFixture("MUNSHI");
    const pm = meFixture("PM");
    for (const n of names) {
      expect(canAccess(munshi, REPORTS[n].access)).toBe(false);
      expect(canAccess(pm, REPORTS[n].access)).toBe(true);
    }
    expect(canAccess(meFixture("PM", { deny: ["equipment.view"] }), REPORTS["equipment-utilisation"].access)).toBe(false);
    const items = visibleSections(munshi, COMPANY_NAV).find((s) => s.id === "reports")?.items ?? [];
    expect(items).toEqual([]);
  });
});
