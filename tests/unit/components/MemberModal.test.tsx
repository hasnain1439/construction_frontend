import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me, TeamUserDetail, UserPermissions } from "@/api/types";
import { unionGrants } from "@/lib/rolePermissions";
import { catalogFixture, meFixture, rolesFixture } from "../fixtures";
import { renderWithStore } from "../render";

const roles = rolesFixture();
const pmRole = roles.find((r) => r.key === "PROJECT_MANAGER")!;
const accountant = roles.find((r) => r.key === "ACCOUNTANT")!;
const ok = <T,>(value: T) => vi.fn((_arg: unknown) => ({ unwrap: async () => value }));
const create = ok({ id: "inv-1", status: "PENDING", expiresAt: "2026-10-21T00:00:00.000Z", inviteUrl: "https://app.test/invite/abc" });
const setRoles = ok({});
const setOverrides = ok({});
const updateUser = ok({});

const bilal: TeamUserDetail = {
  id: "u-bilal",
  name: "Bilal Ahmed",
  phone: "+923331112233",
  email: null,
  role: "PM",
  status: "ACTIVE",
  canSeeFinancials: false,
  allProjects: false,
  permissionRole: { id: pmRole.id, key: pmRole.key, name: pmRole.name },
  permissionRoles: [{ id: pmRole.id, key: pmRole.key, name: pmRole.name }],
  projects: [],
  lastActiveAt: null,
  language: "ENGLISH",
  activeDeviceCount: 1,
  lastLoginAt: null,
  deactivatedAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
};
const pnl = { key: "finance.pnl.view", source: "override" as const, roles: [], scope: "ASSIGNED_PROJECTS" as const, maxAmountPaisa: null };
const bilalPerms: UserPermissions = {
  user: { id: bilal.id, name: bilal.name, role: "PM" },
  owner: false,
  role: { id: pmRole.id, key: pmRole.key, name: pmRole.name },
  roles: [{ id: pmRole.id, key: pmRole.key, name: pmRole.name }],
  effective: [
    ...pmRole.permissions.map((g) => ({ key: g.key, source: "role" as const, roles: [], scope: g.scope, maxAmountPaisa: null })),
    pnl,
  ],
  overrides: [{ key: "finance.pnl.view", effect: "ALLOW", scope: null, maxAmountPaisa: null, note: null }],
  denied: [],
  permissions: [],
  fieldAccess: { rates: true, amounts: false, profit: false, contract: false },
  scopes: {},
  approvalLimits: {},
};

vi.mock("@/api/services/permissions.api", () => ({
  useGetRolesQuery: () => ({ data: roles, refetch: vi.fn() }),
  useGetPermissionCatalogQuery: () => ({ data: catalogFixture, refetch: vi.fn() }),
  useGetUserPermissionsQuery: () => ({ data: bilalPerms, refetch: vi.fn() }),
  useSetUserRolesMutation: () => [setRoles, { isLoading: false }],
  useSetUserOverridesMutation: () => [setOverrides, { isLoading: false }],
}));
vi.mock("@/api/services/team.api", () => ({
  useCreateInvitationMutation: () => [create, { isLoading: false }],
  useGetUserQuery: () => ({ data: bilal, refetch: vi.fn() }),
  useUpdateUserMutation: () => [updateUser, { isLoading: false }],
  useSetUserProjectsMutation: () => [ok({}), { isLoading: false }],
  useDeactivateUserMutation: () => [ok({}), { isLoading: false }],
  useReactivateUserMutation: () => [ok({}), { isLoading: false }],
  useIssueLoginCodeMutation: () => [ok({}), { isLoading: false }],
  useSetUserPasswordMutation: () => [ok({}), { isLoading: false }],
}));
vi.mock("@/features/projects/hooks/useProjectOptions", () => ({
  useProjectOptions: () => ({ options: [], projects: [], isLoading: false }),
}));

const { EditMemberModal, InviteMemberModal } = await import("@/features/team/components/MemberModal");

const roleBox = (key: string) => within(document.querySelector(`[data-role="${key}"]`) as HTMLElement).getByRole("checkbox");
const cell = (key: string) => document.querySelector(`[data-permission="${key}"]`) as HTMLElement;
const box = (key: string) => within(cell(key)).getByRole("checkbox");
const summary = () => screen.getByTestId("permission-diff-summary");

function invite(me: Me = meFixture("THEKEDAR")) {
  const user = userEvent.setup();
  renderWithStore(<InviteMemberModal open onOpenChange={() => {}} />, { me });
  return user;
}

beforeEach(() => {
  for (const f of [create, setRoles, setOverrides, updateUser]) f.mockClear();
});

describe("Add member modal: Details | Roles | Custom permissions", { timeout: 60_000 }, () => {
  it("a centered modal with three tabs; Next / Back move between them; Save on every tab", async () => {
    const user = invite();
    expect(screen.getByTestId("member-modal")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Personal details", "Roles", "Custom permissions"]);
    expect(screen.getByRole("tab", { name: "Personal details" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Send invite" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("tab", { name: "Roles" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("tab", { name: "Custom permissions" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send invite" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("tab", { name: "Roles" })).toHaveAttribute("aria-selected", "true");
  });

  it("Administrator ticks everything except owner-only; Project Manager + one extra − one removed → roleIds + overrides", async () => {
    const user = invite();
    await user.type(screen.getByLabelText(/Name/), "Usman Ghani");
    await user.type(screen.getByLabelText(/Phone/), "03451112233");
    expect(screen.getByTestId("account-type")).toHaveTextContent("Set by the role: Office accounts (PM)");

    await user.click(screen.getByRole("tab", { name: "Roles" }));
    expect(roleBox("PROJECT_MANAGER")).toBeChecked();
    await user.click(roleBox("PROJECT_MANAGER"));
    await user.click(roleBox("ADMINISTRATOR"));
    // Office and site roles don't mix.
    expect(roleBox("MUNSHI")).toBeDisabled();
    expect(screen.getByText(/can't be combined/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Custom permissions" }));
    expect(box("clients.client.create")).toBeChecked();
    expect(box("billing.invoice.view")).toBeChecked();
    expect(box("subscription.manage")).toBeDisabled();
    expect(box("subscription.manage")).not.toBeChecked();
    expect(summary()).toHaveTextContent("Exactly the permissions of Administrator");

    await user.click(screen.getByRole("tab", { name: "Roles" }));
    await user.click(roleBox("ADMINISTRATOR"));
    await user.click(roleBox("PROJECT_MANAGER"));
    await user.click(screen.getByRole("tab", { name: "Custom permissions" }));
    expect(box("billing.invoice.view")).not.toBeChecked();
    expect(cell("projects.project.view")).toHaveAttribute("data-from-role");
    await user.click(box("billing.invoice.view"));
    await user.click(box("clients.client.create"));
    expect(cell("billing.invoice.view")).toHaveAttribute("data-diff", "added");
    expect(cell("clients.client.create")).toHaveAttribute("data-diff", "removed");
    expect(summary()).toHaveTextContent("+1 added, −1 removed vs Project Manager");

    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0]).toMatchObject({
      name: "Usman Ghani",
      role: "PM",
      canSeeFinancials: false,
      roleIds: [pmRole.id],
      permissionOverrides: [
        { key: "clients.client.create", effect: "DENY" },
        { key: "billing.invoice.view", effect: "ALLOW", scope: "ASSIGNED_PROJECTS" },
      ],
    });
  });

  it("several roles: the union is pre-ticked and both roles are sent", async () => {
    const user = invite();
    await user.type(screen.getByLabelText(/Name/), "Two Roles");
    await user.type(screen.getByLabelText(/Phone/), "03451110002");
    await user.click(screen.getByRole("tab", { name: "Roles" }));
    await user.click(roleBox("ACCOUNTANT"));
    await user.click(screen.getByRole("tab", { name: "Custom permissions" }));
    const union = unionGrants([pmRole, accountant]);
    expect(box("finance.pnl.view")).toBeChecked();
    expect(summary()).toHaveTextContent("Exactly the permissions of Project Manager + Accountant");
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(create.mock.calls[0]![0]).toMatchObject({ roleIds: [pmRole.id, accountant.id] });
    expect((create.mock.calls[0]![0] as { permissionOverrides?: unknown }).permissionOverrides).toBeUndefined();
    expect(Object.keys(union).length).toBeGreaterThan(pmRole.permissions.length);
  });

  it("Munshi role → site account; errors on Personal details switch back and mark the tab; no role → Roles tab", async () => {
    const user = invite();
    await user.click(screen.getByRole("tab", { name: "Roles" }));
    await user.click(roleBox("PROJECT_MANAGER"));
    await user.click(roleBox("MUNSHI"));
    expect(roleBox("ADMINISTRATOR")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(create).not.toHaveBeenCalled();
    expect(await screen.findByRole("tab", { name: /Personal details/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("details-tab-error")).toBeInTheDocument();
    expect(screen.getByTestId("account-type")).toHaveTextContent("Site accounts (Munshi)");

    await user.type(screen.getByLabelText(/Name/), "Naveed Iqbal");
    await user.type(screen.getByLabelText(/Phone/), "03127654321");
    await user.click(screen.getByRole("tab", { name: "Roles" }));
    await user.click(roleBox("MUNSHI"));
    await user.click(screen.getByRole("button", { name: "Send invite" }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /Roles/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Choose at least one role.")).toBeInTheDocument();
  });

  it("a non-owner manager can't give roles or keys they don't hold", async () => {
    const manager = meFixture("PM", { permissions: [...pmRole.permissions.map((g) => g.key), "team.member.manage"] as never });
    const user = invite(manager);
    await user.click(screen.getByRole("tab", { name: "Roles" }));
    expect(roleBox("ADMINISTRATOR")).toBeDisabled();
    expect(within(document.querySelector('[data-role="ADMINISTRATOR"]') as HTMLElement).getByText("You don't have it")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Custom permissions" }));
    expect(box("billing.invoice.view")).toBeDisabled();
    expect(within(cell("billing.invoice.view")).getByText("You don't have it")).toBeInTheDocument();
  });

  it("shows the tabs in Urdu", () => {
    renderWithStore(<InviteMemberModal open onOpenChange={() => {}} />, { me: meFixture("THEKEDAR"), ui: { language: "ur" } });
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["ذاتی معلومات", "عہدے", "اپنی مرضی کی اجازتیں"]);
  });
});

describe("Edit member modal", { timeout: 60_000 }, () => {
  it("adding a role that already gives an extra permission: PUT roles, and the extra is no longer an override", async () => {
    const user = userEvent.setup();
    renderWithStore(<EditMemberModal userId={bilal.id} onClose={() => {}} />, { me: meFixture("THEKEDAR") });
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Personal details", "Roles", "Custom permissions"]);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.click(screen.getByRole("tab", { name: "Custom permissions" }));
    expect(cell("finance.pnl.view")).toHaveAttribute("data-diff", "added");
    await user.click(screen.getByRole("tab", { name: "Roles" }));
    expect(roleBox("PROJECT_MANAGER")).toBeChecked();
    await user.click(roleBox("ACCOUNTANT"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateUser).not.toHaveBeenCalled();
    expect(setRoles).toHaveBeenCalledWith({ userId: bilal.id, body: { roleIds: [pmRole.id, accountant.id] } });
    expect(setOverrides).toHaveBeenCalledWith({ userId: bilal.id, body: { overrides: [] } });
  });

  it("removing a role key by hand saves a DENY override", async () => {
    const user = userEvent.setup();
    renderWithStore(<EditMemberModal userId={bilal.id} onClose={() => {}} />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("tab", { name: "Custom permissions" }));
    await user.click(box("clients.client.create"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(setRoles).not.toHaveBeenCalled();
    expect(setOverrides).toHaveBeenCalledWith({
      userId: bilal.id,
      body: { overrides: [{ key: "clients.client.create", effect: "DENY" }, { key: "finance.pnl.view", effect: "ALLOW", scope: "ASSIGNED_PROJECTS" }] },
    });
  });
});
