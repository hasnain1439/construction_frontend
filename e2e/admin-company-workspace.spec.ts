import { expect, test, type Page } from "@playwright/test";
import { passwordInput, SEED } from "./helpers";

async function adminSignIn(page: Page) {
  await page.goto("/admin/overview");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(SEED.admin.email);
  await passwordInput(page).fill(SEED.admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/overview$/, { timeout: 20_000 });
}

/**
 * Company data: the company app's tabs sit in the admin rail (same layout as the company dashboard). Opening any tab shows the
 * company (tenant) picker on that screen; choosing a company shows that screen's data for
 * it, and switching company keeps the screen. Every link stays inside the admin console.
 */
test("super admin: open a tab → pick the company on that screen → its data; switch company keeps the screen", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await adminSignIn(page);
  const sidebar = page.getByRole("navigation", { name: "Platform" });
  const company = page.getByRole("combobox", { name: "Company" });
  const pick = async (name: RegExp) => {
    await company.click();
    await page.getByRole("option", { name }).click();
  };

  // The company's tabs are listed before any company is chosen; open Suppliers & Stock → Purchases.
  await sidebar.getByRole("button", { name: "Suppliers & Stock" }).click();
  await page
    .getByRole("menu", { name: "Suppliers & Stock" })
    .getByRole("menuitem", { name: "Purchases", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/data\/suppliers-stock\/purchases$/);
  await expect(page.getByRole("status").getByText("Choose a company")).toBeVisible();

  // Choose the company on this screen → the same screen with its purchases.
  await pick(/Malik & Sons Builders/);
  await expect(page).toHaveURL(/\/admin\/data\/suppliers-stock\/purchases$/);
  await expect(page.getByRole("heading", { level: 1, name: /Purchases/ })).toBeVisible();
  await page.screenshot({ path: "test-results/workspace-purchases.png" });

  // Switch company → still Purchases, now for the other company.
  await pick(/Ahmed/);
  await expect(page).toHaveURL(/\/admin\/data\/suppliers-stock\/purchases$/);
  await expect(page.getByRole("heading", { level: 1, name: /Purchases/ })).toBeVisible();
  await pick(/Malik & Sons Builders/);

  // A purchase's own link opens its detail inside the console.
  await page.getByRole("row").nth(1).click();
  await expect(page).toHaveURL(/\/admin\/data\/suppliers-stock\/purchases\/[0-9a-f-]{36}$/);

  // Projects tab → a project → project tabs in the sidebar.
  await sidebar.getByRole("button", { name: "Projects" }).click();
  await page.getByRole("menu", { name: "Projects" }).getByRole("menuitem", { name: "All Projects" }).click();
  await expect(page).toHaveURL(/\/admin\/data\/projects$/);
  // Many test projects exist; find the seeded one by name first.
  await page.getByPlaceholder(/Search name/).fill("DHA Phase 6");
  await page.getByText("DHA Phase 6 · 10 Marla").first().click();
  await expect(page).toHaveURL(/\/admin\/data\/projects\/[0-9a-f-]{36}/);
  await expect(sidebar.getByRole("button", { name: "Planning" })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "All projects" })).toBeVisible();
  await page.screenshot({ path: "test-results/workspace-project.png" });

  // Team: the company's people — the hidden system user is not listed.
  await page.goto("/admin/data/team/members");
  await expect(page.getByText("Khalid Malik").first()).toBeVisible();
  await expect(page.getByText("Super Admin (Platform)")).toHaveCount(0);

  // Add a worker from the console — saved through the company's own rules; the company's
  // Timeline names the super admin.
  const name = `Admin Worker ${Date.now().toString().slice(-6)}`;
  await page.goto("/admin/data/workforce/workers");
  await page.getByRole("button", { name: "Add worker" }).first().click();
  const form = page.getByRole("dialog");
  await form.getByRole("textbox", { name: "Name" }).fill(name);
  await form.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option").first().click();
  await form.getByRole("button", { name: "Add worker" }).click();
  await expect(page.getByText(name).first()).toBeVisible();
  const tenants = (await (await page.request.get("/api/v1/admin/tenants?limit=50")).json()) as {
    data: Array<{ id: string; name: string }>;
  };
  const malik = tenants.data.find((t) => /Malik/.test(t.name))!;
  const detail = (await (await page.request.get(`/api/v1/admin/tenants/${malik.id}`)).json()) as {
    data: { auditEvents: Array<{ action: string; actorType: string }> };
  };
  expect(detail.data.auditEvents.find((e) => e.action.startsWith("worker."))?.actorType).toBe(
    "PLATFORM_ADMIN",
  );

  // Clear the company → the screen stays and asks again.
  await page.getByRole("button", { name: "Clear company" }).click();
  await expect(page).toHaveURL(/\/admin\/data\/workforce\/workers$/);
  await expect(page.getByRole("status").getByText("Choose a company")).toBeVisible();
});
