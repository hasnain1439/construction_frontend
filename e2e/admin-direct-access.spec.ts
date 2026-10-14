import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { passwordInput, SEED, signIn } from "./helpers";

/** Where screenshots go (E2E_SHOT_DIR overrides test-results/). */
const shot = (name: string) => path.join(process.env.E2E_SHOT_DIR ?? "test-results", name);

async function adminSignIn(page: Page) {
  await page.goto("/admin/overview");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(SEED.admin.email);
  await passwordInput(page).fill(SEED.admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/overview$/, { timeout: 20_000 });
}

/**
 * Direct access: picking a company opens it at once with full access — no reason, no read-only
 * mode, no timer. A small neutral bar names the company with Exit. Writes work; the owner sees
 * them in the company audit log as "Platform support · <admin>".
 */
test("super admin: pick a company → full access at once → write → exit; owner sees it in the audit log", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  await adminSignIn(page);
  await expect(page.getByRole("link", { name: /Support Sessions/ })).toHaveCount(0);
  await page.goto("/admin/data/dashboard");
  await page.getByRole("combobox", { name: "Company" }).click();
  await page.getByRole("option", { name: /Malik & Sons Builders/ }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  const banner = page.getByTestId("act-as-banner");
  await expect(banner).toContainText("Viewing Malik & Sons Builders");
  await expect(banner).not.toContainText(/read-only|min left|write mode/i);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.screenshot({ path: shot("direct-access-dashboard.png") });

  // Writes work straight away with only X-Act-As-Tenant.
  const name = `Direct Access Traders ${Date.now().toString().slice(-6)}`;
  const created = await page.evaluate(async (supplier) => {
    const cookies = Object.fromEntries(document.cookie.split("; ").map((c) => c.split("=")));
    const res = await fetch("/api/v1/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Act-As-Tenant": cookies["act_as_tenant"] },
      body: JSON.stringify({ name: supplier, category: "Cement" }),
    });
    return res.status;
  }, name);
  expect(created).toBe(201);

  // Exit → leaves the company.
  await banner.getByRole("button", { name: "Exit" }).click();
  await expect(banner).toHaveCount(0);

  // The owner sees the change in their audit log under the admin's name.
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const owner = await ownerContext.newPage();
  await signIn(owner, SEED.thekedar);
  await owner.goto("/settings/audit-log");
  // (The owner's UI language varies, so no filter click — the newest rows are the admin's.)
  const row = owner.getByRole("row").filter({ hasText: "supplier.create" }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("Platform support");
  await expect(row).toContainText("Platform Admin");
  await owner.screenshot({ path: shot("company-audit-log.png") });
  await ownerContext.close();
});
