import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Company } from "@/api/types";
import { CompanyProfileForm } from "@/features/company/components/CompanyProfileForm";
import { renderWithStore } from "../render";

const company = {
  id: "t1",
  name: "Malik & Sons Builders",
  ntn: "1234567-8",
  address: "Gulberg III, Lahore",
  phone: "+924235761234",
  email: "office@maliksons.pk",
  region: "PUNJAB_KP",
  marlaStandard: 225,
  logoAttachmentId: null,
  logoUrl: null,
} as unknown as Company;

describe("company profile", () => {
  it("opens read-only; Edit shows the form, Cancel goes back", async () => {
    renderWithStore(<CompanyProfileForm company={company} />);
    expect(screen.getByTestId("company-profile-view")).toHaveTextContent("Gulberg III, Lahore");
    expect(screen.queryByRole("textbox", { name: /Company name/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox", { name: /Company name/ })).toHaveValue("Malik & Sons Builders");
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("company-profile-view")).toBeInTheDocument();
  });

  it("no Edit while the company is read-only", () => {
    renderWithStore(<CompanyProfileForm company={company} />, { ui: { readOnlyHit: true } });
    expect(screen.getByTestId("company-profile-view")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });
});
