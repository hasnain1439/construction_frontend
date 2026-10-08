import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../render";

const issue = vi.fn(() => ({
  unwrap: async () => ({ phone: "+923224567890", code: "482913", expiresIn: 600 }),
}));
const setPassword = vi.fn((_args: { id: string; password: string }) => ({
  unwrap: async () => ({ passwordSet: true }),
}));
vi.mock("@/api/services/team.api", () => ({
  useIssueLoginCodeMutation: () => [issue, { isLoading: false }],
  useSetUserPasswordMutation: () => [setPassword, { isLoading: false }],
}));

const { MunshiSignIn, whatsAppCodeLink } = await import("@/features/team/components/MunshiSignIn");

describe("Edit member → Sign-in help (munshi)", () => {
  it("gets a one-time code to pass on, with a WhatsApp link that has the code typed in", async () => {
    const user = userEvent.setup();
    renderWithStore(<MunshiSignIn userId="u1" name="Asif" />);
    await user.click(screen.getByRole("button", { name: /Get login code/ }));
    expect(issue).toHaveBeenCalledWith("u1");
    expect(await screen.findByTestId("login-code")).toHaveTextContent("482913");
    expect(screen.getByText(/Valid for 10 minutes/)).toBeInTheDocument();
    const wa = screen.getByRole("link", { name: /Send on WhatsApp/ });
    expect(wa).toHaveAttribute("href", whatsAppCodeLink("+923224567890", "482913"));
    expect(decodeURIComponent(wa.getAttribute("href")!)).toContain(
      "https://wa.me/923224567890?text=Munshi app login code: 482913",
    );
  });

  it("sets a password (button only once it is long enough)", async () => {
    const user = userEvent.setup();
    renderWithStore(<MunshiSignIn userId="u1" name="Asif" />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Set a password"), "Asif#2026");
    await user.click(save);
    expect(setPassword).toHaveBeenCalledWith({ id: "u1", password: "Asif#2026" });
  });
});
