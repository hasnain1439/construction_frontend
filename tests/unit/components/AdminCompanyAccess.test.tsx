import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantDetail } from "@/api/types";
import { CompanyDetailView } from "@/features/admin/views/CompanyDetailView";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/companies/t1",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({ tenant: undefined as unknown, setOfflineOffice: vi.fn(), setMobileApp: vi.fn() }));

vi.mock("@/api/services/admin/tenants.api", () => ({
  useGetTenantQuery: () => ({ data: api.tenant, isLoading: false }),
  useSetTenantStatusMutation: () => [vi.fn(), { isLoading: false }],
  useSetTenantPlanMutation: () => [vi.fn(), { isLoading: false }],
  useSetTenantOfflineOfficeMutation: () => [api.setOfflineOffice, { isLoading: false }],
  useSetTenantMobileAppMutation: () => [api.setMobileApp, { isLoading: false }],
}));
vi.mock("@/api/services/admin/plans.api", () => ({ useGetAdminPlansQuery: () => ({ data: [] }) }));
vi.mock("@/features/admin/views/CompanyDataTabs", () => ({
  CompanyProjectsTab: () => null,
  CompanyTeamTab: () => null,
  CompanyActivityTab: () => null,
}));

const TENANT = (offlineOfficeAllowed: boolean, mobileAppAllowed = true): TenantDetail => ({
  id: "t1",
  name: "Malik & Sons Builders",
  slug: "malik-sons",
  status: "ACTIVE",
  region: "PUNJAB_KP",
  ntn: null,
  address: null,
  phone: null,
  email: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  owner: null,
  settings: {
    marlaStandard: 225,
    timezone: "Asia/Karachi",
    defaultLanguage: "en",
    kharchaApprovalLimitPaisa: "0",
    taxEnabled: false,
    offlineOfficeAllowed,
    mobileAppAllowed,
  },
  subscription: null,
  usage: { activeProjects: { used: 0, limit: 1 }, officeUsers: { used: 1, limit: 2 } },
  payments: [],
  auditEvents: [],
});

beforeEach(() => {
  api.setOfflineOffice.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ id: "t1" }) });
  api.setMobileApp.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ id: "t1", mobileAppAllowed: false, signedOut: 2 }) });
});

/** The settings card with this title. */
const card = (title: string) => within(screen.getByRole("heading", { name: title }).closest("section")!);

describe("Admin console → company → Offline office and Mobile app", () => {
  it("allows offline office with an optional note after confirming", async () => {
    api.tenant = TENANT(false);
    renderWithStore(<CompanyDetailView tenantId="t1" />);
    expect(card("Offline office").getByText("Not allowed")).toBeInTheDocument();
    await userEvent.click(card("Offline office").getByRole("button", { name: "Allow" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.type(within(dialog).getByLabelText("Note (optional)"), "Asked on call");
    await userEvent.click(within(dialog).getByRole("button", { name: "Allow offline office" }));
    await waitFor(() =>
      expect(api.setOfflineOffice).toHaveBeenCalledWith({
        id: "t1",
        body: { allowed: true, note: "Asked on call" },
      }),
    );
  });

  it("stops offline office for an allowed company", async () => {
    api.tenant = TENANT(true);
    renderWithStore(<CompanyDetailView tenantId="t1" />);
    expect(card("Offline office").getByText("Allowed")).toBeInTheDocument();
    await userEvent.click(card("Offline office").getByRole("button", { name: "Stop" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Stop offline office" }));
    await waitFor(() =>
      expect(api.setOfflineOffice).toHaveBeenCalledWith({ id: "t1", body: { allowed: false } }),
    );
  });

  it("mobile app: stops it for an allowed company (signs the phones out), allows it again", async () => {
    api.tenant = TENANT(false, true);
    renderWithStore(<CompanyDetailView tenantId="t1" />);
    expect(card("Mobile app").getByText("Allowed")).toBeInTheDocument();
    await userEvent.click(card("Mobile app").getByRole("button", { name: "Stop" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.type(within(dialog).getByLabelText("Note (optional)"), "Not paid");
    await userEvent.click(within(dialog).getByRole("button", { name: "Stop the mobile app" }));
    await waitFor(() => expect(api.setMobileApp).toHaveBeenCalledWith({ id: "t1", body: { allowed: false, note: "Not paid" } }));
  });

  it("mobile app: a new company starts without it and the admin allows it", async () => {
    api.tenant = TENANT(false, false);
    renderWithStore(<CompanyDetailView tenantId="t1" />);
    expect(card("Mobile app").getByText("Not allowed")).toBeInTheDocument();
    await userEvent.click(card("Mobile app").getByRole("button", { name: "Allow" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Allow the mobile app" }));
    await waitFor(() => expect(api.setMobileApp).toHaveBeenCalledWith({ id: "t1", body: { allowed: true } }));
  });
});
