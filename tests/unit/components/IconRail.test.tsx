import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconRail } from "@/components/layout/IconRail";
import { activeSection, COMPANY_NAV, PROJECT_NAV } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

describe("IconRail", () => {
  it("highlights ONLY the active item", () => {
    const current = activeSection(COMPANY_NAV, "/settings/price-list");
    expect(current?.id).toBe("settings");

    renderWithStore(
      <IconRail sections={COMPANY_NAV} activeSectionId={current?.id} openSectionId="projects" onSelect={() => {}} />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(COMPANY_NAV.length);
    const highlighted = buttons.filter((b) => b.getAttribute("aria-current") === "page");
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toHaveTextContent("Settings");
    expect(buttons.filter((b) => b.hasAttribute("data-active"))).toHaveLength(1);
    // The open flyout is announced, not highlighted.
    expect(screen.getByRole("button", { name: /projects/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /projects/i })).not.toHaveAttribute("aria-current");
  });

  it("calls onSelect with the section", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithStore(<IconRail sections={COMPANY_NAV} activeSectionId="dashboard" openSectionId={null} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /workforce/i }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "workforce" }));
  });

  it("switches labels to Roman Urdu", () => {
    renderWithStore(<IconRail sections={COMPANY_NAV} activeSectionId={undefined} openSectionId={null} onSelect={() => {}} />, {
      ui: { language: "roman-ur" },
    });
    expect(screen.getByRole("button", { name: /hisaab/i })).toBeInTheDocument();
  });

  it("resolves the active project section by path", () => {
    expect(activeSection(PROJECT_NAV, "/projects/p1/planning/floors-rooms", "p1")?.id).toBe("p.planning");
    expect(activeSection(PROJECT_NAV, "/projects/p1/overview", "p1")?.id).toBe("p.overview");
  });

  it("gives a PM no Team, Settings or Finance in the rail", () => {
    const pm = meFixture("PM");
    const visible = COMPANY_NAV.filter((s) => canAccess(pm, s.access)).map((s) => s.id);
    expect(visible).not.toContain("team");
    expect(visible).not.toContain("settings");
    expect(visible).not.toContain("finance");
    expect(visible).toContain("projects");
  });
});
