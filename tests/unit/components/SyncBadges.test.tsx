import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DeviceRow, SyncDeviceStatus } from "@/api/types";
import { AttendanceGrid } from "@/components/common/AttendanceGrid";
import { LateSyncBadge, LATE_SYNC_HINT } from "@/components/common/LateSyncBadge";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const DEVICES: DeviceRow[] = [
  {
    id: "d1",
    user: { id: "u1", name: "Rafaqat Ali", role: "MUNSHI" },
    platform: "ANDROID",
    model: "Infinix Hot 30",
    appVersion: "1.0.0",
    lastActiveAt: "2026-10-06T08:00:00.000Z",
    lastSyncAt: "2026-10-06T08:00:00.000Z",
    pendingUploads: 0,
    revokedAt: null,
    current: false,
  },
  {
    id: "d2",
    user: { id: "u2", name: "Asif", role: "MUNSHI" },
    platform: "ANDROID",
    model: "Tecno Spark 10",
    appVersion: "1.0.0",
    lastActiveAt: "2026-10-04T08:00:00.000Z",
    lastSyncAt: "2026-10-04T08:00:00.000Z",
    pendingUploads: 12,
    revokedAt: null,
    current: false,
  },
];
const STATUS: SyncDeviceStatus[] = [
  { ...DEVICES[0]!, revoked: false, lastActiveAt: DEVICES[0]!.lastActiveAt!, lastRejected: [] },
  {
    ...DEVICES[1]!,
    revoked: false,
    lastActiveAt: DEVICES[1]!.lastActiveAt!,
    lastRejected: [
      {
        clientId: "c1",
        type: "ATTENDANCE_UPSERT",
        code: "WEEK_LOCKED",
        message: "This week is locked",
        deviceCreatedAt: "2026-10-02T09:00:00.000Z",
        at: "2026-10-04T08:00:00.000Z",
      },
      {
        clientId: "c2",
        type: "CASH_EXPENSE_CREATE",
        code: "INSUFFICIENT_CASH",
        message: "Not enough cash",
        deviceCreatedAt: "2026-10-02T10:00:00.000Z",
        at: "2026-10-04T08:00:00.000Z",
      },
    ],
  },
];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/team/devices",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/api/services/team.api", () => ({
  useGetDevicesQuery: () => ({
    data: { items: DEVICES, meta: { total: 2, page: 1, limit: 25 } },
    isLoading: false,
    isFetching: false,
  }),
  useRevokeDeviceMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/api/services/dailyLogs.api", () => ({ useGetSyncStatusQuery: () => ({ data: STATUS }) }));

const { DevicesView } = await import("@/features/team/views/DevicesView");

describe("late sync + phone sync health", () => {
  it("LateSyncBadge says why", () => {
    render(<LateSyncBadge />);
    expect(screen.getByText("📱 late sync").closest("[title]")).toHaveAttribute("title", LATE_SYNC_HINT);
  });

  it("hazri grid marks a late-synced day with 📱", () => {
    render(
      <AttendanceGrid
        dates={["2026-10-05", "2026-10-06"]}
        rows={[
          {
            id: "w1",
            name: "Bashir",
            days: {
              "2026-10-05": { status: "FULL", overtimeHours: 0, lateSync: true },
              "2026-10-06": { status: "HALF", overtimeHours: 0 },
            },
          },
        ]}
        canEdit={() => false}
        today="2026-10-06"
      />,
    );
    expect(screen.getByTestId("late-w1-2026-10-05")).toHaveAttribute("title", LATE_SYNC_HINT);
    expect(screen.queryByTestId("late-w1-2026-10-06")).not.toBeInTheDocument();
  });

  it("Devices: pending uploads and the last refused entries per phone", async () => {
    const user = userEvent.setup();
    renderWithStore(<DevicesView />, { me: meFixture("THEKEDAR") });
    const asif = screen.getByText("Asif").closest("tr")!;
    expect(within(asif).getByText("12")).toBeInTheDocument();
    expect(
      within(screen.getByText("Rafaqat Ali").closest("tr")!).queryByRole("button", { name: /WEEK_LOCKED/ }),
    ).not.toBeInTheDocument();
    await user.click(within(asif).getByRole("button", { name: /WEEK_LOCKED \+1/ }));
    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByText("Hazri")).toBeInTheDocument();
    expect(within(panel).getByText("Kharcha")).toBeInTheDocument();
    expect(within(panel).getByText("This week is locked")).toBeInTheDocument();
  });
});
