import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearActingTenant, setActingTenant } from "@/lib/actingCompany";
import { renderWithStore } from "../render";

const TENANT = "01a10000-0000-7000-8000-000000000001";
let pathname = "/admin/data/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock("@/api/services/admin/tenants.api", () => ({
  useGetTenantQuery: (_id: string, opts: { skip?: boolean }) => ({
    data: opts.skip ? undefined : { id: TENANT, name: "Malik & Sons Builders" },
  }),
}));

const { ActAsBanner } = await import("@/features/admin/actAs/ActAsBanner");

afterEach(() => {
  clearActingTenant();
  pathname = "/admin/data/dashboard";
});

describe("viewing-a-company bar (direct access)", () => {
  it("shows nothing without a chosen company", () => {
    renderWithStore(<ActAsBanner />);
    expect(screen.queryByTestId("act-as-banner")).toBeNull();
  });

  it('reads "Viewing <company>" with Exit — no read-only mode, no timer, no write switch', () => {
    setActingTenant(TENANT);
    renderWithStore(<ActAsBanner />);
    const banner = screen.getByTestId("act-as-banner");
    expect(banner).toHaveTextContent("Viewing Malik & Sons Builders");
    expect(banner).not.toHaveTextContent(/read-only|min left|write mode/i);
    expect(screen.getByRole("button", { name: "Exit" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enable write mode/ })).toBeNull();
  });

  it("outside Company data it links to the company", () => {
    pathname = "/admin/companies";
    setActingTenant(TENANT);
    renderWithStore(<ActAsBanner />);
    expect(screen.getByRole("link", { name: "Open company" })).toHaveAttribute("href", "/admin/data/dashboard");
  });

  it("Exit leaves the company (cookie cleared, nothing sent to the server)", async () => {
    setActingTenant(TENANT);
    renderWithStore(<ActAsBanner />);
    fireEvent.click(screen.getByRole("button", { name: "Exit" }));
    await vi.waitFor(() => expect(document.cookie).not.toContain(TENANT));
    expect(screen.queryByTestId("act-as-banner")).toBeNull();
  });
});
