import { expect, test } from "@playwright/test";
import { cleanUpProject, SEED, signIn } from "./helpers";

/**
 * Thekedar creates a project through all 6 tabs and activates it; it then appears in
 * All Projects. Afterwards the project is moved to "handed over" through the API so
 * repeated runs never use up the plan's active-project limit.
 */
test("Thekedar creates a project through the 6-tab wizard and activates it", async ({ page }) => {
  test.setTimeout(120_000);
  const name = `E2E Villa ${Date.now().toString().slice(-6)}`;
  await signIn(page, SEED.thekedar);

  // Tab 1 — Basic info
  await page.goto("/projects/new");
  await expect(page.getByRole("heading", { level: 1, name: "New Project" })).toBeVisible();
  await page.getByRole("textbox", { name: "Project name" }).fill(name);
  await page.getByRole("combobox", { name: "Client" }).click();
  await page.getByPlaceholder("Search…").fill("Ahmed Raza");
  await page.getByRole("option", { name: /Ahmed Raza/ }).first().click();
  await page.getByRole("textbox", { name: "Site address" }).fill("House 9, Street 4, Gulberg III");
  await page.getByRole("textbox", { name: "City" }).fill("Lahore");
  await page.getByLabel(/^Start date/).fill("2026-11-01");
  await page.getByLabel(/^End date/).fill("2027-10-31");
  await page.getByRole("button", { name: "Create & continue" }).first().click();
  await expect(page).toHaveURL(/\/projects\/new\?id=.+&tab=2/);
  const projectId = new URL(page.url()).searchParams.get("id")!;
  try {

  // Tab 2 — Contract & supply (template stages already total 100 %)
  await page.getByRole("radio", { name: /Full Contract/ }).click();
  await page.getByRole("textbox", { name: "Contract value" }).fill("18500000");
  await expect(page.getByRole("status").filter({ hasText: "100% ✓" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(page).toHaveURL(/tab=3/);

  // Tab 3 — Plot & structure
  await page.getByRole("textbox", { name: "Plot size" }).fill("10");
  await page.getByRole("textbox", { name: "Front" }).fill("35");
  await page.getByRole("textbox", { name: "Depth" }).fill("65");
  await expect(page.getByText(/10 Marla = 2,250 sq ft · 35 × 65 = 2,275 sq ft/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(page).toHaveURL(/tab=4/);

  // Tab 4 — Coverage
  await page.getByRole("textbox", { name: "Covered area" }).fill("2100");
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(page).toHaveURL(/tab=5/);

  // Tab 5 — one room on the ground floor, with live numbers
  await page.getByRole("button", { name: "Add room" }).first().click();
  const room = page.getByRole("form", { name: "New room" });
  await room.getByRole("textbox", { name: "Length" }).fill("16");
  await room.getByRole("textbox", { name: "Width" }).fill("14");
  await room.getByRole("button", { name: "Add opening" }).click();
  await expect(room.getByText(/Floor\s*224\s*sq ft/)).toBeVisible();
  await room.getByRole("button", { name: "Add room" }).click();
  await expect(page.getByRole("form", { name: /^Room / })).toHaveCount(1);
  await page.getByRole("button", { name: "Next" }).first().click();
  await expect(page).toHaveURL(/tab=6/);

  // Tab 6 — Review → Activate
  await expect(page.getByText("Everything needed is filled in")).toBeVisible();
  await page.getByRole("button", { name: "Activate project" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/overview$`));
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  // It appears in All Projects.
  await page.goto("/projects");
  await page.getByRole("searchbox").fill(name);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

  } finally {
    await cleanUpProject(page, projectId);
  }
});
