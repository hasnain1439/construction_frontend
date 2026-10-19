import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShareLink } from "@/api/types";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

/** Owner decision 2 — "Shared links" with a revoke ("Link band karo") per link. */
const api = vi.hoisted(() => ({ links: [] as unknown[], revoke: vi.fn(), args: [] as unknown[] }));
vi.mock("@/api/services/shareLinks.api", () => ({
  useListShareLinksQuery: (arg: unknown) => {
    api.args.push(arg);
    return { data: api.links, isLoading: false, refetch: vi.fn() };
  },
  useRevokeShareLinkMutation: () => [api.revoke, { isLoading: false }],
}));

const { SharedLinksButton } = await import("@/components/common/SharedLinks");

const link = (over: Partial<ShareLink> = {}): ShareLink => ({
  id: "l1",
  refType: "INVOICE",
  refId: "inv1",
  projectId: "p1",
  attachmentId: "a1",
  fileName: "INV-2026-0010.pdf",
  status: "ACTIVE",
  createdAt: "2026-10-19T10:00:00.000Z",
  createdBy: { id: "u1", name: "Khalid Malik" },
  expiresAt: "2026-11-18T10:00:00.000Z",
  revokedAt: null,
  revokedBy: null,
  ...over,
});

beforeEach(() => {
  api.revoke.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(link({ status: "REVOKED" })) });
  api.args = [];
  api.links = [
    link(),
    link({ id: "l2", status: "REVOKED", revokedAt: "2026-10-19T12:00:00.000Z", revokedBy: { id: "u1", name: "Khalid Malik" } }),
    link({ id: "l3", status: "EXPIRED", createdBy: null }),
  ];
});

describe("SharedLinksButton", () => {
  it("lists the links of a document (who / when, expiry, status) and revokes one after a confirmation", async () => {
    const user = userEvent.setup();
    renderWithStore(<SharedLinksButton refType="INVOICE" refId="inv1" />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("button", { name: "Shared links" }));
    expect(api.args.at(-1)).toEqual({ refType: "INVOICE", refId: "inv1" });

    const active = screen.getByTestId("shared-link-l1");
    expect(active).toHaveTextContent("INV-2026-0010.pdf");
    expect(active).toHaveTextContent("Shared by Khalid Malik on");
    expect(active).toHaveTextContent("Works until");
    expect(active).toHaveTextContent("Active");
    expect(screen.getByTestId("shared-link-l2")).toHaveTextContent("Revoked by Khalid Malik on");
    expect(screen.getByTestId("shared-link-l3")).toHaveTextContent("Expired on");
    // only an active link can be revoked
    expect(within(screen.getByTestId("shared-link-l2")).queryByRole("button", { name: "Revoke link" })).toBeNull();
    expect(within(screen.getByTestId("shared-link-l3")).queryByRole("button", { name: "Revoke link" })).toBeNull();

    await user.click(within(active).getByRole("button", { name: "Revoke link" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Revoke this link?");
    expect(api.revoke).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Revoke link" }));
    expect(api.revoke).toHaveBeenCalledWith({ refType: "INVOICE", refId: "inv1", id: "l1" });
  });

  it("Roman Urdu: 'Link band karo'; Urdu labels", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithStore(<SharedLinksButton refType="INVOICE" refId="inv1" />, { me: meFixture("THEKEDAR"), ui: { language: "ur" } });
    expect(screen.getByRole("button", { name: "بھیجے گئے لنکس" })).toBeInTheDocument();
    unmount();
    renderWithStore(<SharedLinksButton refType="CHANGE_ORDER" refId="co1" />, { me: meFixture("THEKEDAR"), ui: { language: "roman-ur" } });
    await user.click(screen.getByRole("button", { name: "Bheje gaye links" }));
    expect(within(screen.getByTestId("shared-link-l1")).getByRole("button", { name: "Link band karo" })).toBeInTheDocument();
  });

  it("hidden without the permission that shares the document", () => {
    const { container, unmount } = renderWithStore(<SharedLinksButton refType="INVOICE" refId="inv1" />, { me: meFixture("PM") });
    expect(container).toBeEmptyDOMElement(); // a PM without billing.invoice.view
    unmount();
    renderWithStore(<SharedLinksButton refType="CHANGE_ORDER" refId="co1" />, { me: meFixture("PM") });
    expect(screen.getByRole("button", { name: "Shared links" })).toBeInTheDocument();
  });
});
