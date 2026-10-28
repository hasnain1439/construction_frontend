import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfficeDevices, SyncProblems } from "@/api/types";
import { changedFields, describePk } from "@/features/company/offlineOffice";
import { OfflineOfficeView } from "@/features/company/views/OfflineOfficeView";
import { COMPANY_NAV, visibleItemIds } from "@/lib/navigation";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/settings/offline-office",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  devices: undefined as unknown,
  problems: undefined as unknown,
  approve: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("@/api/services/edge.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/edge.api")>()),
  useGetOfficeDevicesQuery: () => ({ data: api.devices, isLoading: false, refetch: vi.fn() }),
  useGetSyncProblemsQuery: () => ({ data: api.problems, isLoading: false, refetch: vi.fn() }),
  useApproveOfficeDeviceMutation: () => [api.approve, { isLoading: false }],
  useRevokeOfficeDeviceMutation: () => [api.revoke, { isLoading: false }],
}));

const DEVICES = (over: Partial<OfficeDevices> = {}): OfficeDevices => ({
  allowed: true,
  devices: [
    {
      id: "d1",
      model: "Front desk PC",
      platform: "WINDOWS",
      userName: "Khalid Malik",
      requestedAt: "2026-10-20T09:00:00.000Z",
      approvedAt: null,
      lastSyncAt: null,
    },
    {
      id: "d2",
      model: null,
      platform: "WINDOWS",
      userName: "Sana Iqbal",
      requestedAt: "2026-10-01T09:00:00.000Z",
      approvedAt: "2026-10-02T09:00:00.000Z",
      lastSyncAt: "2026-10-27T09:00:00.000Z",
    },
  ],
  ...over,
});

const PROBLEMS = (over: Partial<SyncProblems> = {}): SyncProblems => ({
  officeMode: true,
  problems: [
    {
      id: "p1",
      tableName: "workers",
      pk: { id: "w1" },
      status: "CONFLICT",
      code: "ROW_CHANGED_IN_CLOUD",
      message: "Changed in the cloud first",
      officeRow: { id: "w1", name: "Aslam", dailyRatePaisa: 150000, active: true },
      cloudRow: { id: "w1", name: "Aslam Khan", dailyRatePaisa: 150000, active: false },
      at: "2026-10-27T10:00:00.000Z",
    },
  ],
  ...over,
});

const owner = () => meFixture("THEKEDAR");

beforeEach(() => {
  api.devices = DEVICES();
  api.problems = PROBLEMS({ officeMode: false, problems: [] });
  api.approve.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ id: "d1", approvedAt: "x" }) });
  api.revoke.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ id: "d2", approvedAt: null }) });
});

describe("offline office helpers", () => {
  it("lists only the fields that differ, office fields first", () => {
    expect(
      changedFields({ id: "1", a: 1, b: { x: 1 }, c: true }, { id: "1", a: 2, b: { x: 1 }, d: "new" }),
    ).toEqual([
      { field: "a", office: 1, cloud: 2 },
      { field: "c", office: true, cloud: undefined },
      { field: "d", office: undefined, cloud: "new" },
    ]);
    expect(changedFields(null, { id: "1" })).toEqual([{ field: "id", office: undefined, cloud: "1" }]);
    expect(changedFields({ a: null }, {})).toEqual([]);
  });

  it("describes a primary key", () => {
    expect(describePk({ projectId: "p1", day: "2026-10-01" })).toBe("projectId: p1 · day: 2026-10-01");
    expect(describePk({})).toBe("");
  });
});

describe("Settings → Offline office", () => {
  it("is in the settings menu only with company.settings.manage", () => {
    expect(visibleItemIds(owner(), COMPANY_NAV)).toContain("settings.offlineOffice");
    expect(visibleItemIds(meFixture("MUNSHI"), COMPANY_NAV)).not.toContain("settings.offlineOffice");
    expect(
      visibleItemIds(meFixture("PM", { permissions: ["company.settings.manage"] }), COMPANY_NAV),
    ).toContain("settings.offlineOffice");
    expect(visibleItemIds(meFixture("PM", { permissions: [] }), COMPANY_NAV)).not.toContain(
      "settings.offlineOffice",
    );
  });

  it("explains that the platform must turn it on when the company is not allowed", () => {
    api.devices = DEVICES({ allowed: false, devices: [] });
    renderWithStore(<OfflineOfficeView />, { me: owner() });
    expect(screen.getByText("Offline office is not turned on for your company")).toBeInTheDocument();
    expect(screen.getByText(/Contact support/)).toBeInTheDocument();
    expect(screen.queryByText("Office computers")).not.toBeInTheDocument();
  });

  it("shows how to set up an office computer when none asked yet", () => {
    api.devices = DEVICES({ devices: [] });
    renderWithStore(<OfflineOfficeView />, { me: owner() });
    expect(screen.getByText("No office computer yet")).toBeInTheDocument();
    expect(screen.getByText(/run the office installer/)).toBeInTheDocument();
  });

  it("approves a waiting computer", async () => {
    renderWithStore(<OfflineOfficeView />, { me: owner() });
    expect(screen.getAllByText("Front desk PC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Waiting for approval").length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]!);
    expect(api.approve).toHaveBeenCalledWith("d1");
  });

  it("asks before revoking an approved computer", async () => {
    renderWithStore(<OfflineOfficeView />, { me: owner() });
    await userEvent.click(screen.getAllByRole("button", { name: "Revoke" })[0]!);
    expect(api.revoke).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Revoke Office computer?")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(api.revoke).toHaveBeenCalledWith("d2"));
  });

  it("in the cloud, says sync problems are on the office computer", () => {
    renderWithStore(<OfflineOfficeView />, { me: owner() });
    expect(screen.getByText(/Sync problems are shown on the office computer itself/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sync problems" })).not.toBeInTheDocument();
  });

  it("on the office computer, lists problems with the changed fields", async () => {
    api.problems = PROBLEMS();
    renderWithStore(<OfflineOfficeView />, { me: owner() });
    expect(screen.getByRole("heading", { name: "Sync problems" })).toBeInTheDocument();
    expect(screen.getByText("workers")).toBeInTheDocument();
    expect(screen.getByText("Changed in both places")).toBeInTheDocument();
    expect(screen.getByText("Cloud version kept")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show changes" }));
    const rows = screen.getAllByRole("row").map((r) => r.textContent);
    expect(rows).toContain("nameAslamAslam Khan");
    expect(rows).toContain("activeYesNo");
    expect(rows.some((r) => r?.startsWith("dailyRatePaisa"))).toBe(false);
  });

  it("shows an empty state on the office computer without problems", () => {
    api.problems = PROBLEMS({ problems: [] });
    renderWithStore(<OfflineOfficeView />, { me: owner() });
    expect(screen.getByText("No sync problems")).toBeInTheDocument();
  });
});
