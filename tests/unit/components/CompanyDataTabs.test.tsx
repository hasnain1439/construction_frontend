import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CompanyActivity, CompanyProjectRow, CompanyTeam } from "@/api/types";
import { renderWithStore } from "../render";

const PROJECTS: CompanyProjectRow[] = [
  {
    id: "p1",
    code: "MSB-2026-012",
    name: "DHA Phase 6 · 10 Marla",
    status: "ACTIVE",
    client: { id: "c1", name: "Ahmed Raza", phone: "+923001112233" },
    city: "Lahore",
    siteAddress: null,
    startDate: "2026-03-01",
    endDate: "2027-02-28",
    contractValuePaisa: "2775000000",
    billedPaisa: "600000000",
    receivedPaisa: "450000000",
    outstandingPaisa: "150000000",
    teamMembers: 3,
    activeWorkers: 8,
    dailyLogs: 5,
    lastDailyLog: "2026-10-06",
    createdAt: "2026-03-01T05:00:00.000Z",
  },
];
const TEAM: CompanyTeam = {
  users: [
    {
      id: "u1",
      name: "Khalid Malik",
      role: "THEKEDAR",
      phone: "+923001234567",
      email: "khalid@example.pk",
      status: "ACTIVE",
      canSeeFinancials: true,
      projects: null,
      lastLoginAt: "2026-10-06T08:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "u2",
      name: "Rafaqat Ali",
      role: "MUNSHI",
      phone: "+923211234567",
      email: null,
      status: "ACTIVE",
      canSeeFinancials: false,
      projects: 1,
      lastLoginAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  devices: [
    {
      id: "d1",
      user: { id: "u2", name: "Rafaqat Ali", role: "MUNSHI" },
      platform: "ANDROID",
      model: "Infinix Hot 30",
      appVersion: "1.0.0",
      lastActiveAt: "2026-10-06T08:00:00.000Z",
      lastSyncAt: "2026-10-06T08:00:00.000Z",
      pendingUploads: 4,
      revoked: false,
    },
  ],
  pendingInvites: 1,
};
const ACTIVITY: CompanyActivity = {
  asOf: "2026-10-07T05:00:00.000Z",
  lastActivityAt: "2026-10-06T08:00:00.000Z",
  lastLoginAt: "2026-10-06T08:00:00.000Z",
  projectsByStatus: { ACTIVE: 3, HANDED_OVER: 2 },
  activeWorkers: 14,
  last30Days: {
    from: "2026-09-07",
    hazriMarks: 212,
    purchases: { count: 9, totalPaisa: "184000000" },
    dispatches: 6,
    kharcha: { count: 31, totalPaisa: "4200000" },
    materialUsageEntries: 18,
    dailyLogs: 22,
    invoicesIssued: { count: 2, totalPaisa: "300000000" },
    paymentsReceived: { count: 1, totalPaisa: "150000000" },
  },
  money: {
    billedPaisa: "600000000",
    receivedPaisa: "450000000",
    receivablesPaisa: "150000000",
    supplierUdhaarPaisa: "247600000",
    cashWithSiteStaffPaisa: "3080000",
  },
};

const calls: string[] = [];
vi.mock("@/api/services/admin/tenants.api", () => ({
  useGetCompanyProjectsQuery: (id: string) => (
    calls.push(`projects:${id}`),
    { data: PROJECTS, isLoading: false }
  ),
  useGetCompanyTeamQuery: (id: string) => (calls.push(`team:${id}`), { data: TEAM, isLoading: false }),
  useGetCompanyActivityQuery: (id: string) => (
    calls.push(`activity:${id}`),
    { data: ACTIVITY, isLoading: false }
  ),
}));

const { CompanyActivityTab, CompanyProjectsTab, CompanyTeamTab } =
  await import("@/features/admin/views/CompanyDataTabs");

describe("super admin: company data tabs", () => {
  it("projects: client, contract and money per project, with the read-only notice", () => {
    renderWithStore(<CompanyProjectsTab tenantId="t1" />);
    expect(calls).toContain("projects:t1");
    expect(screen.getByText(/Read-only view/)).toBeInTheDocument();
    const row = screen.getByText("DHA Phase 6 · 10 Marla").closest("tr")!;
    expect(within(row).getByText("Ahmed Raza")).toBeInTheDocument();
    expect(within(row).getByText("Rs 2,77,50,000")).toBeInTheDocument();
    expect(within(row).getByText("Rs 15,00,000")).toBeInTheDocument();
    expect(within(row).getByText("3 / 8")).toBeInTheDocument();
  });

  it("team: users with role / projects, phones with entries waiting, pending invitations", () => {
    renderWithStore(<CompanyTeamTab tenantId="t1" />);
    const owner = screen.getByText("Khalid Malik").closest("tr")!;
    expect(within(owner).getByText("All")).toBeInTheDocument();
    expect(screen.getByText("1 invitation(s) not accepted yet")).toBeInTheDocument();
    const phone = screen.getByText(/Infinix Hot 30/).closest("tr")!;
    expect(within(phone).getByText("4")).toBeInTheDocument();
  });

  it("activity: money now and the last 30 days", () => {
    renderWithStore(<CompanyActivityTab tenantId="t1" />);
    expect(screen.getByText("Rs 24,76,000")).toBeInTheDocument(); // supplier udhaar
    expect(screen.getByText("Rs 30,800")).toBeInTheDocument(); // cash with site staff
    expect(screen.getByText("212")).toBeInTheDocument();
    expect(screen.getByText("31 · Rs 42,000")).toBeInTheDocument();
  });
});
