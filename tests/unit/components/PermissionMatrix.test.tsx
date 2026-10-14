import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FieldVisibility, PermissionMatrix } from "@/features/team/components/PermissionMatrix";
import { buildMatrix, grantsToBody, sameGrants, type GrantMap } from "@/lib/permissionCatalog";
import { catalogFixture } from "../fixtures";
import { renderWithStore } from "../render";

function Harness({
  initial = {},
  readOnly,
  onChange,
}: {
  initial?: GrantMap;
  readOnly?: boolean;
  onChange?: (g: GrantMap) => void;
}) {
  const [value, setValue] = useState<GrantMap>(initial);
  const change = (next: GrantMap) => {
    setValue(next);
    onChange?.(next);
  };
  return (
    <>
      <PermissionMatrix catalog={catalogFixture} value={value} onChange={change} readOnly={readOnly} />
      <FieldVisibility catalog={catalogFixture} value={value} onChange={change} readOnly={readOnly} />
    </>
  );
}

const cell = (key: string) => document.querySelector(`[data-permission="${key}"]`) as HTMLElement;
const row = (module: string) => document.querySelector(`[data-module="${module}"]`) as HTMLElement;

describe("buildMatrix", () => {
  it("modules are rows (without data visibility), actions are columns, every non-field key appears once", () => {
    const rows = buildMatrix(catalogFixture);
    expect(rows.map((r) => r.module)).not.toContain("fields");
    expect(rows[0]!.module).toBe("projects");
    const placed = rows.flatMap((r) =>
      Object.values(r.cells)
        .flat()
        .map((p) => p.key),
    );
    const expected = catalogFixture.permissions.filter((p) => !p.field).map((p) => p.key);
    expect(placed.sort()).toEqual(expected.sort());
    const labor = rows.find((r) => r.module === "labor")!;
    expect(labor.cells.approve.map((p) => p.key)).toEqual(
      expect.arrayContaining(["labor.settlement.approve", "labor.measurement.approve"]),
    );
    // subscription.manage is a two-part key and still lands in "manage".
    expect(rows.find((r) => r.module === "subscription")!.cells.manage.map((p) => p.key)).toEqual([
      "subscription.manage",
    ]);
  });

  it("grantsToBody sends scope only for scoped keys and limits only for limit keys", () => {
    const body = grantsToBody(
      {
        "projects.project.view": { scope: "ALL_PROJECTS", maxAmountPaisa: null },
        "clients.client.view": { scope: "ALL_PROJECTS", maxAmountPaisa: "100" },
        "cashbook.expense.approve": { scope: null, maxAmountPaisa: "5000000" },
        "subscription.manage": { scope: null, maxAmountPaisa: null },
      },
      catalogFixture,
    );
    expect(body).toEqual([
      { key: "cashbook.expense.approve", scope: "ASSIGNED_PROJECTS", maxAmountPaisa: "5000000" },
      { key: "clients.client.view" },
      { key: "projects.project.view", scope: "ALL_PROJECTS" },
    ]);
    expect(
      sameGrants({ a: { scope: null, maxAmountPaisa: null } }, { a: { scope: null, maxAmountPaisa: null } }),
    ).toBe(true);
    expect(sameGrants({ a: { scope: null, maxAmountPaisa: null } }, {})).toBe(false);
  });
});

// A full matrix is ~120 checkboxes: queries are scoped to one cell / row, and the timeout is generous for a loaded CI box.
describe("PermissionMatrix", { timeout: 30_000 }, () => {
  it("renders catalogue labels with checkboxes only where a key exists", () => {
    renderWithStore(<Harness />);
    const head = screen.getByTestId("permission-matrix").querySelector("thead") as HTMLElement;
    expect(within(head).getByRole("columnheader", { name: "Approve" })).toBeInTheDocument();
    expect(
      within(cell("cashbook.expense.approve")).getByRole("checkbox", { name: "Approve kharcha" }),
    ).not.toBeChecked();
    // Clients have no approve / manage keys → an empty marker, no checkbox.
    expect(row("clients").querySelectorAll("[role=checkbox]")).toHaveLength(4); // 3 keys + "select row"
  });

  it("ticking a scoped approve key adds a scope select and an amount limit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithStore(<Harness onChange={onChange} />);
    await user.click(
      within(cell("cashbook.expense.approve")).getByRole("checkbox", { name: "Approve kharcha" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      "cashbook.expense.approve": { scope: "ASSIGNED_PROJECTS", maxAmountPaisa: null },
    });
    const approve = cell("cashbook.expense.approve");
    expect(
      within(approve).getByRole("combobox", { name: "Projects for “Approve kharcha”" }),
    ).toHaveTextContent("Assigned projects");
    const limit = within(approve).getByRole("textbox", { name: "Approval limit for “Approve kharcha”" });
    await user.type(limit, "50000");
    expect(onChange).toHaveBeenLastCalledWith({
      "cashbook.expense.approve": { scope: "ASSIGNED_PROJECTS", maxAmountPaisa: "5000000" },
    });
    // Unticking removes the grant.
    await user.click(
      within(cell("cashbook.expense.approve")).getByRole("checkbox", { name: "Approve kharcha" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it("owner-only keys are shown but can't be ticked", () => {
    renderWithStore(<Harness />);
    expect(
      within(cell("subscription.manage")).getByRole("checkbox", { name: /Subscription & payments/ }),
    ).toBeDisabled();
    expect(within(cell("company.settings.manage")).getByText("Owner only")).toBeInTheDocument();
  });

  it("the row toggle selects every grantable key of a module", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithStore(<Harness onChange={onChange} />);
    await user.click(within(row("company")).getByRole("checkbox", { name: "Everything in Company" }));
    expect(Object.keys(onChange.mock.lastCall![0]).sort()).toEqual([
      "company.holiday.manage",
      "company.opening.manage",
      "company.profile.view",
    ]);
  });

  it("field visibility toggles grant fields.* keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithStore(<Harness onChange={onChange} />);
    await user.click(document.querySelector('[data-field="fields.profit"] [role=switch]') as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith({ "fields.profit": { scope: null, maxAmountPaisa: null } });
  });

  it("is read-only for system templates", () => {
    renderWithStore(
      <Harness
        readOnly
        initial={{ "projects.project.view": { scope: "ASSIGNED_PROJECTS", maxAmountPaisa: null } }}
      />,
    );
    expect(
      within(cell("projects.project.view")).getByRole("checkbox", { name: "View projects" }),
    ).toBeChecked();
    expect(
      within(cell("projects.project.view")).getByRole("checkbox", { name: "View projects" }),
    ).toBeDisabled();
    expect(document.querySelector('[data-field="fields.profit"] [role=switch]')).toBeDisabled();
  });

  it("shows labels in Urdu", () => {
    renderWithStore(<Harness />, { ui: { language: "ur" } });
    expect(
      within(cell("cashbook.expense.approve")).getByRole("checkbox", { name: "خرچہ منظور کرنا" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("permission-matrix").querySelector("thead") as HTMLElement).getByRole(
        "columnheader",
        { name: "منظوری" },
      ),
    ).toBeInTheDocument();
  });
});
