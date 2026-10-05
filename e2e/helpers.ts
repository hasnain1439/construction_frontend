import { execSync } from "node:child_process";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

/** Seed accounts (construction-platform `npm run db:seed`). */
export const SEED = {
  thekedar: { login: "03001234567", password: "Thekedar#2026", name: "Khalid Malik" },
  pm: { login: "03331112233", password: "Bilal#2026", name: "Bilal Ahmed" },
  admin: { email: "admin@platform.local", password: "Admin#2026" },
} as const;

export async function signIn(page: Page, account: { login: string; password: string }) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email or phone", exact: true }).fill(account.login);
  await passwordInput(page).fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** The password input (its label carries a required *). */
export const passwordInput = (page: Page) => page.locator('input[name="password"]');

/** The main icon rail. */
export const rail = (page: Page) => page.getByRole("navigation", { name: "Main" });

/**
 * Leaves the dev database as it was: a draft is deleted; an active project is moved to
 * "handed over" so it no longer counts against the plan's active-project limit.
 */
export async function cleanUpProject(page: Page, projectId: string) {
  const res = await page.request.get(`/api/v1/projects/${projectId}`);
  if (!res.ok()) return;
  const status = ((await res.json()) as { data: { status: string } }).data.status;
  if (status === "DRAFT") {
    await page.request.delete(`/api/v1/projects/${projectId}`);
    return;
  }
  const path = status === "ACTIVE" ? ["CLOSEOUT", "HANDED_OVER"] : status === "CLOSEOUT" ? ["HANDED_OVER"] : [];
  for (const next of path) {
    await page.request.patch(`/api/v1/projects/${projectId}/status`, { data: { status: next, note: "E2E clean-up" } });
  }
}

/**
 * A fresh LOGIN code for a phone, from the backend's dev helper (`npm run dev:otp`), so a
 * munshi can sign in without reading the API console. Needs ../construction-platform.
 */
export function devOtp(phone: string): string {
  const out = execSync(`npm run -s dev:otp -- ${phone}`, { cwd: path.resolve(__dirname, "../../construction-platform"), encoding: "utf8" });
  const code = /OTP=(\d{6})/.exec(out)?.[1];
  if (!code) throw new Error(`dev:otp gave no code: ${out}`);
  return code;
}
