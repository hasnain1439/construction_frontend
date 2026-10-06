import { expect, test, type Page } from "@playwright/test";
import { devOtp, SEED, signIn } from "./helpers";

// 1×1 PNG used as the challan photo
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function pickOption(page: Page, combobox: ReturnType<Page["getByRole"]>, search: string) {
  await combobox.click();
  await page.getByPlaceholder(/Search/).last().fill(search);
  await page.getByRole("option", { name: new RegExp(search) }).first().click();
}

/**
 * Store purchase → dispatch to DHA → the munshi blind-counts it short → the owner sends the
 * remaining. The extra gate pass is cancelled at the end so the dev database stays tidy.
 */
test("purchase → dispatch → munshi receives short → owner sends the remaining", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const tag = Date.now().toString().slice(-6);
  await signIn(page, SEED.thekedar);

  // 1. Store purchase: 20 bags from Al-Madina
  await page.goto("/suppliers-stock/purchases/new");
  await expect(page.getByRole("heading", { level: 1, name: "New purchase" })).toBeVisible();
  await pickOption(page, page.getByRole("combobox", { name: "Supplier" }), "Al-Madina Cement Agency");
  await page.getByRole("textbox", { name: "Challan no." }).fill(`E2E-${tag}`);
  await pickOption(page, page.getByRole("combobox", { name: "Line 1 material" }), "Cement OPC");
  await page.getByRole("textbox", { name: "Cement OPC Challan qty" }).fill("20");
  // The agreed rate fills in when the supplier has one; type it so the test does not depend on it.
  await page.getByRole("textbox", { name: "Cement OPC Rate" }).fill("1430");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "challan.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("challan.png")).toBeVisible();
  await page.getByRole("button", { name: "Save purchase" }).click();
  await expect(page).toHaveURL(/\/suppliers-stock\/purchases\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/PUR-\d{4}-\d{4}/).first()).toBeVisible();

  // 2. Dispatch the 20 bags to DHA
  await page.goto("/suppliers-stock/store-stock");
  await page.getByRole("button", { name: "Dispatch to site" }).click();
  await pickOption(page, page.getByRole("combobox", { name: "To site" }), "DHA Phase 6");
  await pickOption(page, page.getByRole("combobox", { name: "Line 1 material" }), "Cement OPC");
  await page.getByRole("textbox", { name: "Cement OPC Send" }).fill("20");
  await page.getByRole("textbox", { name: "Vehicle no." }).fill(`E2E-${tag}`);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const sent = page.getByText(/GP-\d{4} sent/);
  await expect(sent).toBeVisible();
  const gp = (await sent.textContent())!.match(/GP-\d{4}/)![0];

  const projects = await page.request.get("/api/v1/projects?limit=100");
  const dha = ((await projects.json()) as { data: Array<{ id: string; code: string }> }).data.find((p) => p.code === "MSB-2026-012")!;

  // 3. Rafaqat (munshi) signs in with an SMS code and blind-counts the delivery
  const munshiContext = await browser.newContext();
  const munshi = await munshiContext.newPage();
  await munshi.goto("/login");
  await munshi.getByRole("tab", { name: "Phone OTP" }).click();
  await munshi.getByRole("textbox", { name: "Mobile number" }).fill("0321 1234567");
  await munshi.getByRole("button", { name: "Send code" }).click();
  await expect(munshi.getByText("Enter the code").first()).toBeVisible();
  const code = devOtp("+923211234567");
  for (const [i, digit] of [...code].entries()) await munshi.getByRole("textbox", { name: `Digit ${i + 1}` }).fill(digit);
  await expect(munshi.getByText("Choose a company").first()).toBeVisible();
  await munshi.getByRole("button", { name: /Malik & Sons Builders/ }).click();
  await expect(munshi).toHaveURL(/\/dashboard$/);

  await munshi.goto(`/projects/${dha.id}/site/incoming`);
  const card = munshi.locator("section").filter({ hasText: gp });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText("20 bags"); // blind count: the sent quantity is hidden
  await card.getByRole("link", { name: "Receive" }).click();
  await munshi.getByRole("textbox", { name: "Cement OPC Counted" }).fill("18");
  await munshi.getByRole("textbox", { name: "Cement OPC Note" }).fill("2 bags missing (E2E)");
  await munshi.getByRole("button", { name: "Save count" }).click();
  await expect(munshi.getByText("Count saved — here is what was sent")).toBeVisible();
  await expect(munshi.getByText("Short · -2 bags")).toBeVisible();
  await munshiContext.close();

  // 4. Khalid resolves the shortage: send the remaining 2 bags
  await page.goto("/suppliers-stock/shortages");
  const row = page.getByRole("row").filter({ hasText: gp });
  await row.getByRole("button", { name: "Resolve" }).click();
  await page.getByRole("radio", { name: /Send the remaining/ }).click();
  await page.getByRole("textbox", { name: "Note" }).fill("Loaded short at the store (E2E)");
  await page.getByRole("button", { name: "Save decision" }).click();
  const resolved = page.getByText(/Resolved — GP-\d{4} is on the way/);
  await expect(resolved).toBeVisible();
  const newGp = (await resolved.textContent())!.match(/GP-\d{4}/)![0];

  // 5. The new gate pass is on the dispatch list
  await page.goto("/suppliers-stock/dispatches");
  const newRow = page.getByRole("row").filter({ hasText: newGp });
  await expect(newRow).toContainText("On the way");

  // Clean-up: cancel the replacement gate pass (the 2 bags go back to the store)
  const list = await page.request.get(`/api/v1/dispatches?search=${newGp}`);
  const replacement = ((await list.json()) as { data: Array<{ id: string; number: string }> }).data.find((d) => d.number === newGp);
  if (replacement) await page.request.post(`/api/v1/dispatches/${replacement.id}/cancel`);
});
