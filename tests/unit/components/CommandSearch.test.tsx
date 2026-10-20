import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandSearch } from "@/components/common/CommandSearch";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => ({}),
}));

const open = (role: "THEKEDAR" | "MUNSHI") =>
  renderWithStore(<CommandSearch mode="company" />, { me: meFixture(role), ui: { commandOpen: true } });

describe("CommandSearch (Ctrl+K)", () => {
  it("opens without crashing and finds a page by a word of its name", () => {
    open("THEKEDAR");
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "price" } });
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Price List"]);
  });

  it("lists create actions once and goes to the page", () => {
    open("THEKEDAR");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new project" } });
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["New project"]);
    fireEvent.click(options[0]!);
    expect(push).toHaveBeenCalledWith("/projects/new");
  });

  it("shows only the pages the user may open", () => {
    open("MUNSHI");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "price" } });
    expect(screen.queryByRole("option", { name: /Price List/ })).toBeNull();
  });
});
