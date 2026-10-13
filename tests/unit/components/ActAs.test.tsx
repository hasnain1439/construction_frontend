import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActAsSession } from "@/api/types";
import { clearActingTenant, setActingTenant } from "@/lib/actingCompany";
import { renderWithStore } from "../render";

const TENANT = "01a10000-0000-7000-8000-000000000001";
const SESSION = "01a10000-0000-7000-8000-0000000000f0";

const session = (over: Partial<ActAsSession> = {}): ActAsSession => ({
  id: SESSION,
  tenant: { id: TENANT, name: "Malik & Sons Builders", slug: "malik-and-sons" },
  admin: { id: "a1", name: "Platform Admin", email: "admin@platform.local" },
  reason: "Owner asked us to check a supplier balance",
  mode: "READ_ONLY",
  writeReason: null,
  writeEnabledAt: null,
  startedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  expiresAt: new Date(Date.now() + 42 * 60_000 - 5_000).toISOString(),
  endedAt: null,
  status: "ACTIVE",
  secondsLeft: 42 * 60,
  ...over,
});

const ok = <T,>(value: T) => ({ unwrap: () => Promise.resolve(value) });
const start = vi.fn((body: unknown) => ok({ ...session(), body }));
const changeMode = vi.fn((arg: unknown) => ok({ ...session({ mode: "WRITE" }), arg }));
const endSession = vi.fn(() => ok(session({ status: "ENDED" })));
let current: ActAsSession | undefined;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/data/dashboard",
}));
vi.mock("@/api/services/admin/actAs.api", () => ({
  useGetActAsSessionQuery: (_id: string, opts: { skip?: boolean }) => ({
    data: opts.skip ? undefined : current,
  }),
  useStartActAsSessionMutation: () => [start, { isLoading: false }],
  useChangeActAsModeMutation: () => [changeMode, { isLoading: false }],
  useEndActAsSessionMutation: () => [endSession, { isLoading: false }],
}));

const { ActAsBanner } = await import("@/features/admin/actAs/ActAsBanner");
const { StartActAsDialog } = await import("@/features/admin/actAs/StartActAsDialog");

beforeEach(() => {
  vi.clearAllMocks();
  current = session();
});
afterEach(() => clearActingTenant());

describe("start support session dialog", () => {
  it("needs a 5+ character reason, starts read-only and hands back the session", async () => {
    const onStarted = vi.fn();
    renderWithStore(
      <StartActAsDialog
        company={{ id: TENANT, name: "Malik & Sons Builders" }}
        onOpenChange={() => undefined}
        onStarted={onStarted}
      />,
    );
    expect(screen.getByText("Open Malik & Sons Builders as platform support")).toBeInTheDocument();
    expect(screen.getByText(/starts read-only/)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Start read-only session" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "fix" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason/), {
      target: { value: "  Owner asked for help with a bill  " },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await vi.waitFor(() => expect(onStarted).toHaveBeenCalled());
    expect(start).toHaveBeenCalledWith({
      tenantId: TENANT,
      reason: "Owner asked for help with a bill",
      durationMinutes: 60,
    });
  });
});

describe("acting-as banner", () => {
  it("shows nothing without a support session", () => {
    renderWithStore(<ActAsBanner />);
    expect(screen.queryByTestId("act-as-banner")).toBeNull();
  });

  it('reads "Acting as <company> · read-only · 42 min left · End"', () => {
    setActingTenant(TENANT, SESSION);
    renderWithStore(<ActAsBanner />);
    const banner = screen.getByTestId("act-as-banner");
    expect(banner).toHaveTextContent("Acting as Malik & Sons Builders");
    expect(banner).toHaveTextContent("read-only");
    expect(banner).toHaveTextContent("42 min left");
    expect(screen.getByRole("button", { name: "End" })).toBeInTheDocument();
  });

  it("write mode needs a second reason", async () => {
    setActingTenant(TENANT, SESSION);
    renderWithStore(<ActAsBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Enable write mode" }));
    const confirm = screen.getAllByRole("button", { name: "Enable write mode" }).at(-1)!;
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/What will you change/), {
      target: { value: "Remove the duplicated payment" },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await vi.waitFor(() =>
      expect(changeMode).toHaveBeenCalledWith({
        id: SESSION,
        body: { mode: "WRITE", reason: "Remove the duplicated payment" },
      }),
    );
  });

  it("in write mode offers the way back to read-only", () => {
    current = session({ mode: "WRITE", writeReason: "Remove the duplicated payment" });
    setActingTenant(TENANT, SESSION);
    renderWithStore(<ActAsBanner />);
    expect(screen.getByTestId("act-as-banner")).toHaveTextContent("write mode");
    expect(screen.getByRole("button", { name: "Back to read-only" })).toBeInTheDocument();
  });

  it("End ends the session on the server and leaves the company", async () => {
    setActingTenant(TENANT, SESSION);
    renderWithStore(<ActAsBanner />);
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    fireEvent.click(screen.getByRole("button", { name: "End session" }));
    await vi.waitFor(() => expect(endSession).toHaveBeenCalledWith(SESSION));
    await vi.waitFor(() => expect(document.cookie).not.toContain(SESSION));
  });

  it("an expired session leaves the company by itself", async () => {
    current = session({ status: "EXPIRED", secondsLeft: 0 });
    setActingTenant(TENANT, SESSION);
    renderWithStore(<ActAsBanner />);
    await vi.waitFor(() => expect(document.cookie).not.toContain(SESSION));
  });
});
