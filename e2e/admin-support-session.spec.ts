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
 * Support session (act-as): picking a company asks for a reason and starts READ-ONLY; the red
 * banner shows the company, mode and time left on every admin page; writing needs a second
 * reason; End leaves. The session is listed in the console and in the company's audit log.
 */
test("super admin: reason → read-only banner → write mode with a reason → end; owner sees it in the audit log", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  await adminSignIn(page);
  await page.goto("/admin/data/dashboard");
  await page.getByRole("combobox", { name: "Company" }).click();
  await page.getByRole("option", { name: /Malik & Sons Builders/ }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText("Open Malik & Sons Builders as platform support")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Start read-only session" })).toBeDisabled();
  await dialog.getByLabel(/Reason/).fill("Owner asked us to check a wrong supplier balance (ticket 1042)");
  await page.screenshot({ path: shot("start-session-dialog.png") });
  await dialog.getByRole("button", { name: "Start read-only session" }).click();

  const banner = page.getByTestId("act-as-banner");
  await expect(banner).toContainText("Acting as Malik & Sons Builders");
  await expect(banner).toContainText("read-only");
  await expect(banner).toContainText(/\d+ min left/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.screenshot({ path: shot("banner-read-only.png") });

  // Writes are refused while read-only (the API answers 403 ACT_AS_READ_ONLY).
  const blocked = await page.evaluate(async () => {
    const cookies = Object.fromEntries(document.cookie.split("; ").map((c) => c.split("=")));
    const res = await fetch("/api/v1/suppliers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Act-As-Tenant": cookies["act_as_tenant"],
        "X-Act-As-Session": cookies["act_as_session"],
      },
      body: JSON.stringify({ name: "Should not exist", category: "Cement" }),
    });
    return { status: res.status, code: ((await res.json()) as { error?: { code?: string } }).error?.code };
  });
  expect(blocked).toEqual({ status: 403, code: "ACT_AS_READ_ONLY" });

  // Write mode needs a second reason.
  await banner.getByRole("button", { name: "Enable write mode" }).click();
  const write = page.getByRole("alertdialog");
  await write
    .getByLabel(/What will you change/)
    .fill("Remove the duplicated supplier payment the owner reported");
  await page.screenshot({ path: shot("write-mode-dialog.png") });
  await write.getByRole("button", { name: "Enable write mode" }).click();
  await expect(banner).toContainText("write mode");
  await page.screenshot({ path: shot("banner-write-mode.png") });

  // The banner stays on every admin page; the sessions list shows the live session.
  await page.goto("/admin/support-sessions");
  await expect(banner).toContainText("Acting as Malik & Sons Builders");
  await expect(page.getByRole("cell", { name: /ticket 1042/ }).first()).toBeVisible();
  await page.screenshot({ path: shot("support-sessions-list.png") });

  // End → leaves the company.
  await banner.getByRole("button", { name: "End" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "End session" }).click();
  await expect(banner).toHaveCount(0);

  // The owner sees the session in their audit log (with the admin's name and reason).
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const owner = await ownerContext.newPage();
  await signIn(owner, SEED.thekedar);
  await owner.goto("/settings/audit-log");
  await owner
    .getByRole("radio", { name: "Platform support only" })
    .click()
    .catch(() => owner.getByText("Platform support only").click());
  await expect(owner.getByText("Opened your account (read-only)").first()).toBeVisible();
  await expect(owner.getByText(/ticket 1042/).first()).toBeVisible();
  await owner.screenshot({ path: shot("company-audit-log.png") });
  await ownerContext.close();
});
