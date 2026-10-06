import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification, ApprovalItem as Item } from "@/api/types";
import { renderWithStore } from "../render";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/dashboard" }));

const markRead = vi.fn();
const markAll = vi.fn();
const unreadCall = vi.fn();
const NOTES: AppNotification[] = [
  {
    id: "n1",
    type: "CHEQUE_BOUNCED",
    severity: "CRITICAL",
    title: "Cheque bounced — DHA Phase 6 · 10 Marla",
    body: "MCB cheque 118845 (Rs 11,00,000) bounced: insufficient funds.",
    project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla" },
    refType: "PAYMENT",
    refId: "pay1",
    actionUrl: "/projects/p1/billing/payments",
    read: false,
    readAt: null,
    smsSent: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    type: "LOW_STOCK",
    severity: "WARNING",
    title: "Low stock: Chenab sand",
    body: "Central Store has 300 cft left (minimum 500).",
    project: null,
    refType: "MATERIAL",
    refId: "m1",
    actionUrl: "/suppliers-stock/store-stock",
    read: true,
    readAt: "2026-10-05T04:00:00.000Z",
    smsSent: false,
    createdAt: "2026-10-02T11:00:00.000Z",
  },
];
vi.mock("@/api/services/notifications.api", () => ({
  UNREAD_POLL_MS: 60_000,
  useGetUnreadCountQuery: (arg: unknown, options: unknown) => {
    unreadCall(arg, options);
    return { data: { count: 3, critical: 1, warning: 1 } };
  },
  useGetNotificationsQuery: () => ({ data: { items: NOTES, meta: { page: 1, limit: 10, total: 2, totalPages: 1 } }, isLoading: false }),
  useMarkNotificationReadMutation: () => [markRead, { isLoading: false }],
  useMarkAllNotificationsReadMutation: () => [markAll, { isLoading: false }],
}));

const exportReport = vi.fn();
vi.mock("@/api/services/reports.api", () => ({
  useExportReportMutation: () => [exportReport, { isLoading: false }],
}));

const { NotificationBell, badgeText } = await import("@/components/common/NotificationBell");
const { dayLabel, groupByDay } = await import("@/components/common/NotificationList");
const { ExportMenu } = await import("@/components/common/ExportMenu");
const { ApprovalItem } = await import("@/components/common/ApprovalItem");
const { commonActions } = await import("@/components/common/BulkActionBar");
const { AgeingBar } = await import("@/components/common/AgeingBar");

beforeEach(() => {
  push.mockReset();
  markRead.mockReset();
  exportReport.mockReset();
});

describe("NotificationBell", () => {
  it("shows the unread count (red when something critical), polls every 60 s and on focus", () => {
    renderWithStore(<NotificationBell />);
    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("3");
    expect(badge).toHaveClass("bg-danger");
    expect(unreadCall).toHaveBeenCalledWith(undefined, expect.objectContaining({ pollingInterval: 60_000, refetchOnFocus: true }));
    expect(badgeText(150)).toBe("99+");
  });

  it("lists the latest, marks one read, and opens its page on click", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    renderWithStore(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /Notifications: 3 unread/ }));
    expect(screen.getByText("Cheque bounced — DHA Phase 6 · 10 Marla")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/dashboard/alerts");
    // Only the unread one has a "mark read" button.
    expect(screen.getAllByRole("button", { name: /as read/ })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: 'Mark "Cheque bounced — DHA Phase 6 · 10 Marla" as read' }));
    expect(markRead).toHaveBeenCalledWith("n1");
    await user.click(screen.getByText("Low stock: Chenab sand"));
    expect(push).toHaveBeenCalledWith("/suppliers-stock/store-stock");
    expect(markRead).toHaveBeenCalledTimes(1); // already read → not marked again
  });

  it("groups by Karachi day", () => {
    expect(dayLabel(new Date().toISOString())).toBe("Today");
    expect(groupByDay(NOTES).map((g) => g.label)).toEqual(["Today", "2 Oct 2026"]);
  });
});

describe("ExportMenu", () => {
  it("asks the API for the chosen format with the filters and opens the returned link", { timeout: 20_000 }, async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    exportReport.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://files/supplier-ageing.xlsx", fileName: "supplier-ageing-2026-10-06.xlsx" }) });
    const user = userEvent.setup();
    renderWithStore(<ExportMenu name="supplier-ageing" filters={{ projectId: "p1" }} />);
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Excel" }));
    expect(exportReport).toHaveBeenCalledWith({ name: "supplier-ageing", format: "xlsx", projectId: "p1" });
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith("https://files/supplier-ageing.xlsx", "_blank", "noopener,noreferrer"));
    open.mockRestore();
  });
});

const ITEM: Item = {
  type: "MEASUREMENT_TO_VERIFY",
  id: "m1",
  title: "Ustad Sharif Shuttering: 650 sqft",
  subtitle: "Mumty slab",
  project: { id: "p1", code: "MSB-2026-012", name: "DHA" },
  amountPaisa: "2925000",
  createdAt: "2026-10-04T12:00:00.000Z",
  ageDays: 2,
  actionUrl: "/projects/p1/labor/measurements",
  quickActions: [
    { action: "verify", label: "Verify", needsNote: false, needsMethod: false },
    { action: "reject", label: "Reject", needsNote: true, needsMethod: false },
  ],
};

describe("ApprovalItem", () => {
  it("shows only the actions the API allows; reject asks for a note first", { timeout: 20_000 }, async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <ul>
        <ApprovalItem item={ITEM} onAction={onAction} />
      </ul>,
    );
    const li = screen.getByRole("listitem");
    expect(within(li).getAllByRole("button").map((b) => b.textContent)).toEqual(["Verify", "Reject"]);
    expect(within(li).getByText("Rs 29,250")).toBeInTheDocument();
    expect(within(li).getByText(/MSB-2026-012 · Mumty slab · waiting 2 days/)).toBeInTheDocument();
    await user.click(within(li).getByRole("button", { name: "Verify" }));
    expect(onAction).toHaveBeenCalledWith(ITEM, "verify", {});
    await user.click(within(li).getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Reject" });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Note"), "Wrong area");
    await user.click(confirm);
    expect(onAction).toHaveBeenLastCalledWith(ITEM, "reject", { note: "Wrong area" });
  });

  it("no quick actions (and no amount for this role) → just Open", () => {
    render(
      <ul>
        <ApprovalItem item={{ ...ITEM, type: "SHORTAGE_OPEN", amountPaisa: null, quickActions: [] }} onAction={vi.fn()} />
      </ul>,
    );
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", ITEM.actionUrl);
    expect(screen.queryByText(/Rs /)).not.toBeInTheDocument();
  });

  it("bulk bar offers only the actions every selected item allows", () => {
    const approve = { action: "approve" as const, label: "Approve", needsNote: false, needsMethod: false };
    const reject = { action: "reject" as const, label: "Reject", needsNote: true, needsMethod: false };
    const verify = { action: "verify" as const, label: "Verify", needsNote: false, needsMethod: false };
    expect(commonActions([[approve, reject], [verify, reject]]).map((a) => a.action)).toEqual(["reject"]);
    expect(commonActions([[approve, reject], [approve, reject]]).map((a) => a.action)).toEqual(["approve", "reject"]);
  });
});

describe("AgeingBar", () => {
  it("draws only buckets with money and writes every amount out", () => {
    render(
      <AgeingBar
        ageing={[
          { bucket: "0-15", amountPaisa: "0" },
          { bucket: "16-30", amountPaisa: "48000000" },
          { bucket: "31-60", amountPaisa: "110000000" },
          { bucket: "60+", amountPaisa: "0" },
        ]}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", expect.stringContaining("31-60 days Rs 11,00,000"));
    expect(screen.getAllByTitle(/days:/)).toHaveLength(2);
    expect(screen.getByText("Rs 11 L")).toBeInTheDocument();
  });
});
