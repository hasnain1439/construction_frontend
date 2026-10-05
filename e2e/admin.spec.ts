import { expect, test } from "@playwright/test";
import { passwordInput, SEED } from "./helpers";

test("platform admin signs in and sees the console", async ({ page }) => {
  await page.goto("/admin/companies");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(SEED.admin.email);
  await passwordInput(page).fill(SEED.admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/companies$/);
  await expect(page.getByRole("heading", { level: 1, name: "Companies" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Malik & Sons Builders/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: /Overview/ }).click();
  await expect(page.getByText("Monthly recurring revenue")).toBeVisible();
  await expect(page.getByText("Service health")).toBeVisible();
});
