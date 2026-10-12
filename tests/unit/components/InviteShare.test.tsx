import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InviteShare, inviteMessage } from "@/components/common/InviteShare";
import { renderWithStore } from "../render";

const url = "http://localhost:3000/invite/abc123";

describe("InviteShare", () => {
  it("builds a friendly message with the name, company, role and link", () => {
    const text = inviteMessage({ name: "Usman", companyName: "Malik & Sons", roleLabel: "Munshi", url });
    expect(text).toContain("Usman");
    expect(text).toContain("Malik & Sons ne aap ko Munshi ke taur par");
    expect(text).toContain(url);
  });

  it("shows the link and ready-made WhatsApp / SMS / email links", () => {
    renderWithStore(<InviteShare url={url} name="Usman" phone="+923451112233" email="usman@example.com" companyName="Malik & Sons" roleLabel="Munshi" />);
    expect(screen.getByTestId("invite-link")).toHaveTextContent(url);
    const wa = screen.getByRole("link", { name: /WhatsApp/ });
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/923451112233\?text=/);
    expect(decodeURIComponent(wa.getAttribute("href")!)).toContain(url);
    expect(screen.getByRole("link", { name: /SMS/ }).getAttribute("href")).toMatch(/^sms:\+923451112233\?body=/);
    expect(screen.getByRole("link", { name: /Email/ }).getAttribute("href")).toMatch(/^mailto:usman@example\.com\?subject=/);
    expect(screen.getByRole("button", { name: /Copy link/ })).toBeInTheDocument();
  });

  it("hides SMS / email when there is no phone or email", () => {
    renderWithStore(<InviteShare url={url} name="Usman" />);
    expect(screen.queryByRole("link", { name: /SMS/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Email/ })).toBeNull();
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toBeInTheDocument();
  });
});
