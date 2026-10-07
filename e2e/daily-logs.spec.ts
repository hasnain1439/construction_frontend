import { expect, test } from "@playwright/test";
import { SEED, signIn } from "./helpers";

/**
 * Step 10 smoke: the seeded DHA daily logs (written by Rafaqat on the phone, one reached the
 * office late) and the phones' sync health on Team → Devices. Read-only — no clean-up needed.
 */
test("Daily Logs & Photos shows the munshi's logs with photos + late sync; Devices shows pending uploads", async ({
  page,
}) => {
  await signIn(page, SEED.thekedar);

  const res = await page.request.get("/api/v1/projects?search=DHA&limit=5");
  const dha = ((await res.json()) as { data: Array<{ id: string; name: string }> }).data[0];
  expect(dha, "seeded DHA project").toBeTruthy();

  await page.goto(`/projects/${dha!.id}/site/daily-logs`);
  await expect(page.getByRole("heading", { name: dha!.name }).first()).toBeVisible();
  await expect(page.getByText("Rafaqat Ali").first()).toBeVisible();
  await expect(page.getByText("📱 late sync").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Open photo 1/ }).first()).toBeVisible();

  await page
    .getByRole("button", { name: /Day summary/ })
    .first()
    .click();
  const summary = page.getByRole("dialog");
  await expect(summary.getByText("Hazri")).toBeVisible();
  await expect(summary.getByText("Material used")).toBeVisible();
  await page.keyboard.press("Escape");

  // Asif's phone (12 waiting) may be on a later page — check it through the API the page uses.
  const status = (await (await page.request.get("/api/v1/sync/status")).json()) as {
    data: Array<{ model: string | null; pendingUploads: number }>;
  };
  expect(status.data.find((d) => d.model === "Tecno Spark 10")?.pendingUploads).toBe(12);

  await page.goto("/team/devices");
  await expect(page.getByRole("columnheader", { name: "Last rejected" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Infinix Hot 30" })).toBeVisible();
});
