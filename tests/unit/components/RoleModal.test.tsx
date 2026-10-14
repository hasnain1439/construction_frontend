import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionRole } from "@/api/types";
import { catalogFixture, meFixture, rolesFixture } from "../fixtures";
import { renderWithStore } from "../render";

const siteLead: PermissionRole = {
  ...rolesFixture()[0]!,
  id: "role-custom",
  key: "CUSTOM_1",
  name: "Site lead",
  nameRoman: "Site lead",
  nameUrdu: null,
  description: null,
  isSystem: false,
  baseRole: "PM",
  permissions: [{ key: "projects.project.view", scope: "ASSIGNED_PROJECTS", maxAmountPaisa: null }],
};
const roles = rolesFixture([siteLead]);
const ok = <T,>(value: T) => vi.fn((_arg: unknown) => ({ unwrap: async () => value }));
const create = ok(siteLead);
const update = ok(siteLead);
const setPermissions = ok(siteLead);
const duplicate = ok({ ...siteLead, id: "role-copy" });

vi.mock("@/api/services/permissions.api", () => ({
  useGetRoleQuery: (id: string) => ({ data: roles.find((r) => r.id === id), refetch: vi.fn() }),
  useGetRolesQuery: () => ({ data: roles, refetch: vi.fn() }),
  useGetPermissionCatalogQuery: () => ({ data: catalogFixture, refetch: vi.fn() }),
  useCreateRoleMutation: () => [create, { isLoading: false }],
  useUpdateRoleMutation: () => [update, { isLoading: false }],
  useSetRolePermissionsMutation: () => [setPermissions, { isLoading: false }],
  useDuplicateRoleMutation: () => [duplicate, { isLoading: false }],
}));

const { RoleModal } = await import("@/features/team/components/RoleModal");
const cell = (key: string) => document.querySelector(`[data-permission="${key}"]`) as HTMLElement;
const section = (module: string) => document.querySelector(`[data-module="${module}"]`) as HTMLElement;

function show(roleId: string | null, onOpenRole = vi.fn()) {
  const user = userEvent.setup();
  renderWithStore(<RoleModal open roleId={roleId} onClose={() => {}} onOpenRole={onOpenRole} />, { me: meFixture("THEKEDAR") });
  return user;
}

beforeEach(() => {
  for (const f of [create, update, setPermissions, duplicate]) f.mockClear();
});

describe("Role modal: Details | Permissions", { timeout: 60_000 }, () => {
  it("edits a custom role: details + permissions (select all per module) saved from one footer", async () => {
    const user = show(siteLead.id);
    expect(screen.getByTestId("role-modal")).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Personal details", "Permissions"]);
    await user.clear(screen.getByLabelText(/Name — English/));
    await user.type(screen.getByLabelText(/Name — English/), "Senior site lead");
    await user.click(screen.getByRole("tab", { name: "Permissions" }));
    expect(within(cell("projects.project.view")).getByRole("checkbox")).toBeChecked();
    await user.click(within(section("clients")).getByRole("checkbox", { name: "Everything in Clients" }));
    expect(section("fields").querySelectorAll("[role=switch]").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByTestId("details-tab-error")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: siteLead.id, body: expect.objectContaining({ name: "Senior site lead" }) })));
    const body = setPermissions.mock.calls[0]![0] as { body: { permissions: Array<{ key: string }> } };
    expect(body.body.permissions.map((p) => p.key)).toEqual(expect.arrayContaining(["clients.client.view", "clients.client.create", "projects.project.view"]));
  });

  it("a system template is read-only with Duplicate to edit", async () => {
    const onOpenRole = vi.fn();
    const pm = roles.find((r) => r.key === "PROJECT_MANAGER")!;
    const user = show(pm.id, onOpenRole);
    expect(screen.getByLabelText(/Name — English/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Permissions" }));
    expect(within(cell("projects.project.view")).getByRole("checkbox")).toBeDisabled();
    await user.click(screen.getAllByRole("button", { name: /Duplicate to edit/ })[0]!);
    expect(duplicate).toHaveBeenCalledWith({ id: pm.id });
    expect(onOpenRole).toHaveBeenCalledWith("role-copy", "permissions");
  });

  it("a new role: start from a template copies its permissions; a missing name sends you back to Details", async () => {
    const user = show(null);
    await user.click(screen.getByRole("tab", { name: "Permissions" }));
    await user.click(screen.getByRole("checkbox", { name: "Select all" }));
    await user.click(screen.getByRole("button", { name: "Create role" }));
    expect(create).not.toHaveBeenCalled();
    expect(await screen.findByTestId("details-tab-error")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Personal details/ })).toHaveAttribute("aria-selected", "true");
    await user.type(screen.getByLabelText(/Name — English/), "Everything");
    await user.click(screen.getByRole("button", { name: "Create role" }));
    const body = create.mock.calls[0]![0] as { name: string; permissions: unknown[] };
    expect(body.name).toBe("Everything");
    expect(body.permissions).toHaveLength(catalogFixture.permissions.filter((p) => !p.ownerOnly && !p.field).length);
  });
});
