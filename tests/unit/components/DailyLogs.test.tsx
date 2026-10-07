import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DailyLog, DailyLogDetail } from "@/api/types";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const author = { id: "u1", name: "Rafaqat Ali", role: "MUNSHI" as const };
const project = { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6" };
const LOGS: DailyLog[] = [
  {
    id: "l-old",
    project,
    logDate: "2026-10-03",
    note: null,
    conditions: ["RAIN"],
    workDone: "Shuttering stopped for rain",
    author,
    photos: [],
    voiceNotes: [],
    editable: false,
    lateSync: true,
    clientId: "c1",
    deviceCreatedAt: "2026-10-03T12:00:00.000Z",
    createdAt: "2026-10-05T18:00:00.000Z",
    updatedAt: "2026-10-05T18:00:00.000Z",
  },
  {
    id: "l-today",
    project,
    logDate: "2026-10-06",
    note: "Owner visited",
    conditions: ["CURING", "POWER_CUT"],
    workDone: "Column curing, water given twice",
    author,
    photos: [
      {
        id: "p1",
        mimeType: "image/jpeg",
        url: "https://files/p1.jpg",
        thumbUrl: "https://files/p1-thumb.jpg",
      },
      {
        id: "p2",
        mimeType: "image/jpeg",
        url: "https://files/p2.jpg",
        thumbUrl: "https://files/p2-thumb.jpg",
      },
    ],
    voiceNotes: [{ id: "v1", mimeType: "audio/mp4", url: "https://files/v1.m4a" }],
    editable: false,
    lateSync: false,
    clientId: null,
    deviceCreatedAt: null,
    createdAt: "2026-10-06T12:00:00.000Z",
    updatedAt: "2026-10-06T12:00:00.000Z",
  },
];
const DETAIL: DailyLogDetail = {
  ...LOGS[1]!,
  summary: {
    hazri: { full: 6, half: 1, absent: 2, present: 7 },
    usage: [{ material: { id: "m1", name: "Cement OPC", unit: "bag" }, quantity: 12 }],
    kharcha: { scope: "PROJECT", entries: 3, totalPaisa: "185000" },
  },
};

vi.mock("@/api/services/dailyLogs.api", () => ({
  useGetDailyLogsQuery: () => ({ data: { items: LOGS, meta: { total: 2 } }, isLoading: false }),
  useGetDailyLogQuery: (id: string, opts: { skip?: boolean }) => ({
    data: opts.skip ? undefined : { ...DETAIL, id },
    isFetching: false,
  }),
}));
vi.mock("@/features/projects/views/ProjectModeViews", () => ({
  ProjectPageShell: ({
    children,
    actions,
  }: {
    children: (p: unknown) => ReactNode;
    actions?: (p: unknown) => ReactNode;
  }) => (
    <div>
      {actions?.({ id: "p1" })}
      {children({ id: "p1" })}
    </div>
  ),
}));

const { DailyLogsView, groupByDay } = await import("@/features/site/DailyLogsView");

describe("Daily Logs & Photos", () => {
  it("groups logs by day, newest first", () => {
    expect(groupByDay(LOGS).map(([d]) => d)).toEqual(["2026-10-06", "2026-10-03"]);
  });

  it("shows conditions, work done, author, photos, the voice note and the late-sync badge only where late", () => {
    renderWithStore(<DailyLogsView projectId="p1" />, { me: meFixture("THEKEDAR") });
    const today = screen.getByTestId("log-l-today");
    expect(within(today).getByText("Column curing, water given twice")).toBeInTheDocument();
    expect(within(today).getByText(/Curing/)).toBeInTheDocument();
    expect(within(today).getByText(/Power cut/)).toBeInTheDocument();
    expect(within(today).getByText("Rafaqat Ali")).toBeInTheDocument();
    expect(within(today).getAllByRole("button", { name: /Open photo/ })).toHaveLength(2);
    expect(within(today).getByLabelText("Voice note 1")).toHaveAttribute("src", "https://files/v1.m4a");
    expect(within(today).queryByText("📱 late sync")).not.toBeInTheDocument();

    const old = screen.getByTestId("log-l-old");
    expect(within(old).getByText("📱 late sync")).toBeInTheDocument();
    expect(within(old).getByText(/Written on the phone/)).toBeInTheDocument();
  });

  it("opens a photo full size and steps through the gallery", async () => {
    const user = userEvent.setup();
    renderWithStore(<DailyLogsView projectId="p1" />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("button", { name: "Open photo 1 of 2" }));
    expect(screen.getByRole("img", { name: "Site photo 1" })).toHaveAttribute("src", "https://files/p1.jpg");
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByRole("img", { name: "Site photo 2" })).toHaveAttribute("src", "https://files/p2.jpg");
  });

  it("day summary: hazri, material used and kharcha of that day", async () => {
    const user = userEvent.setup();
    renderWithStore(<DailyLogsView projectId="p1" />, { me: meFixture("THEKEDAR") });
    await user.click(within(screen.getByTestId("log-l-today")).getByRole("button", { name: /Day summary/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Present").previousSibling).toHaveTextContent("7");
    expect(within(dialog).getByText("Cement OPC")).toBeInTheDocument();
    expect(within(dialog).getByText("12 bags")).toBeInTheDocument();
    expect(within(dialog).getByText("3 entries")).toBeInTheDocument();
  });
});
