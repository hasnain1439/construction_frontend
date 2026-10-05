import { expect, test } from "@playwright/test";
import { passwordInput, rail, SEED, signIn } from "./helpers";

test.describe("auth smoke", () => {
  test("Khalid (Thekedar) signs in and lands on the dashboard", async ({ page }) => {
    await signIn(page, SEED.thekedar);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Account menu" })).toContainText(SEED.thekedar.name);
    for (const item of ["Projects", "Team", "Settings", "Finance"]) {
      await expect(rail(page).getByRole("button", { name: item, exact: true })).toBeVisible();
    }
  });

  test("Bilal (PM) has no Team, Settings or Finance in the rail", async ({ page }) => {
    await signIn(page, SEED.pm);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(rail(page).getByRole("button", { name: "Projects", exact: true })).toBeVisible();
    for (const item of ["Team", "Settings", "Finance"]) {
      await expect(rail(page).getByRole("button", { name: item, exact: true })).toHaveCount(0);
    }
  });

  test("a protected page sends a signed-out visitor to login and back", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login\?next=%2Fprojects/);
    await page.getByRole("textbox", { name: "Email or phone", exact: true }).fill(SEED.thekedar.login);
    await passwordInput(page).fill(SEED.thekedar.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("a wrong password shows a friendly error", async ({ page }) => {
    await page.goto("/login");
    // An unregistered number gets the same answer and never locks a seed account.
    await page.getByRole("textbox", { name: "Email or phone", exact: true }).fill("03009999999");
    await passwordInput(page).fill("definitely-wrong-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("tabpanel").getByRole("alert")).toContainText(/wrong phone\/email or password/i);
  });
});
