import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoneyText } from "@/components/common/MoneyText";
import { PermissionGate } from "@/components/common/PermissionGate";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

describe("PermissionGate", () => {
  it("shows content to a user with the permission", () => {
    renderWithStore(
      <PermissionGate permission="users.manage">
        <button type="button">Invite member</button>
      </PermissionGate>,
      { me: meFixture("THEKEDAR") },
    );
    expect(screen.getByRole("button", { name: "Invite member" })).toBeInTheDocument();
  });

  it("hides content (not disables) from a user without it", () => {
    renderWithStore(
      <PermissionGate permission="users.manage">
        <button type="button">Invite member</button>
      </PermissionGate>,
      { me: meFixture("PM") },
    );
    expect(screen.queryByRole("button", { name: "Invite member" })).not.toBeInTheDocument();
  });

  it("checks roles and renders a fallback", () => {
    renderWithStore(
      <PermissionGate roles={["THEKEDAR"]} fallback={<span>Owners only</span>}>
        <span>Settings</span>
      </PermissionGate>,
      { me: meFixture("MUNSHI") },
    );
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.getByText("Owners only")).toBeInTheDocument();
  });

  it("hides everything while signed out", () => {
    renderWithStore(
      <PermissionGate permission="site.entry">
        <span>Site</span>
      </PermissionGate>,
    );
    expect(screen.queryByText("Site")).not.toBeInTheDocument();
  });
});

describe("MoneyText (financial fields omitted by the API)", () => {
  it("shows the amount when present and a placeholder when omitted", () => {
    const { rerender } = renderWithStore(<MoneyText paisa="1850000000" />);
    expect(screen.getByText("Rs 1,85,00,000")).toBeInTheDocument();
    rerender(<MoneyText paisa={undefined} />);
    expect(screen.getByText("Hidden for your role")).toBeInTheDocument();
    rerender(<MoneyText paisa={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
