import { expect, test } from "@playwright/test";
import { passwordInput, SEED } from "./helpers";

/** The super admin looks into one company's data (read-only); the look is audited. */
test("super admin opens a company → Projects, Team & devices, Activity & money → the look is in the Timeline", async ({
  page,
}) => {
  await page.goto("/admin/companies");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(SEED.admin.email);
  await passwordInput(page).fill(SEED.admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/companies$/);

  await page
    .getByRole("cell", { name: /Malik & Sons Builders/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Malik & Sons Builders" })).toBeVisible();

  await page.getByRole("tab", { name: "Projects" }).click();
  await expect(page.getByText("Read-only view of this company's data")).toBeVisible();
  await expect(page.getByRole("cell", { name: /DHA Phase 6/ }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/admin-company-projects.png" });

  await page.getByRole("tab", { name: "Team & devices" }).click();
  await expect(page.getByRole("cell", { name: /Khalid Malik/ }).first()).toBeVisible();
  await expect(page.getByText(/Devices \(\d+\)/)).toBeVisible();
  await page.screenshot({ path: "test-results/admin-company-team.png" });

  await page.getByRole("tab", { name: "Activity & money" }).click();
  await expect(page.getByText("Supplier udhaar")).toBeVisible();
  await expect(page.getByText("Hazri marks")).toBeVisible();
  await page.screenshot({ path: "test-results/admin-company-activity.png", fullPage: true });

  // The look is recorded in the company's own audit trail.
  await page.reload();
  await expect(page.getByText("admin.company_data_viewed").first()).toBeVisible();
});
