import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { cleanUpProject, devOtp, SEED, signIn } from "./helpers";

const MUNSHI_PHONE = "+923211234567";

async function json<T>(res: Awaited<ReturnType<APIRequestContext["get"]>>): Promise<T> {
  expect(res.ok(), `${res.url()} → ${res.status()} ${await res.text()}`).toBeTruthy();
  return ((await res.json()) as { data: T }).data;
}

/** A small ACTIVE project for this run (Bilal PM, Rafaqat munshi) so the test can run any number of times. */
async function createSite(api: APIRequestContext, tag: string) {
  const users = await json<Array<{ id: string; name: string }>>(await api.get("/api/v1/users?limit=100&status=ACTIVE"));
  const bilal = users.find((u) => u.name === SEED.pm.name)!;
  const rafaqat = users.find((u) => u.name === "Rafaqat Ali")!;
  const p = await json<{ id: string }>(
    await api.post("/api/v1/projects", {
      data: {
        name: `E2E labour ${tag}`,
        newClient: { name: `E2E Owner ${tag}`, phone: `0321-9${tag}` },
        siteAddress: "Plot 1, E2E Block",
        city: "Lahore",
        startDate: "2026-09-01",
        endDate: "2027-06-30",
      },
    }),
  );
  await json(await api.patch(`/api/v1/projects/${p.id}/contract`, { data: { contractType: "FULL", billingModel: "STAGE_SCHEDULE", contractValuePaisa: "500000000" } }));
  const plot = await json<{ floors: Array<{ id: string }> }>(
    await api.patch(`/api/v1/projects/${p.id}/plot-structure`, {
      data: { plotUnit: "MARLA", plotSize: 5, frontFt: 25, depthFt: 45, structureType: "FRAMED", hasBasement: false, floors: [{ level: "GROUND", ceilingHeightFt: 11 }] },
    }),
  );
  await json(await api.patch(`/api/v1/projects/${p.id}/coverage`, { data: { coveredAreaSqft: 1000, boundaryWall: false } }));
  await json(await api.post(`/api/v1/floors/${plot.floors[0].id}/rooms`, { data: { type: "TV_LOUNGE", lengthFt: 30, widthFt: 28 } }));
  await json(await api.put(`/api/v1/projects/${p.id}/team`, { data: { pmId: bilal.id, munshiIds: [rafaqat.id] } }));
  await json(await api.post(`/api/v1/projects/${p.id}/activate`));
  return p.id;
}

async function munshiSignIn(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByRole("tab", { name: "Phone OTP" }).click();
  await page.getByRole("textbox", { name: "Mobile number" }).fill("0321 1234567");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("Enter the code").first()).toBeVisible();
  const code = devOtp(MUNSHI_PHONE);
  for (const [i, digit] of [...code].entries()) await page.getByRole("textbox", { name: `Digit ${i + 1}` }).fill(digit);
  await expect(page.getByText("Choose a company").first()).toBeVisible();
  await page.getByRole("button", { name: /Malik & Sons Builders/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return page;
}

async function pick(page: Page, name: string, option: string) {
  await page.getByRole("combobox", { name }).click();
  await page.getByPlaceholder(/Search/).last().fill(option);
  await page.getByRole("option", { name: new RegExp(option) }).first().click();
}

const rupees = (text: string | null) => Number((text ?? "").replace(/[^\d.]/g, ""));

/**
 * Thekedar float → munshi acknowledges · munshi marks hazri, gives peshgi from site cash,
 * generates and submits the week · PM approves · munshi pays from site cash and the
 * balance drops by peshgi + wages.
 */
test("hazri → site-cash peshgi → weekly settlement → PM approves → munshi pays; float acknowledged", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const tag = Date.now().toString().slice(-6);
  await signIn(page, SEED.thekedar);
  const projectId = await createSite(page.request, tag);

  try {
    // 1. Khalid sends Rafaqat a Rs 5,000 float
    await page.goto(`/projects/${projectId}/cash-book/floats`);
    await page.getByRole("button", { name: "Send float" }).first().click();
    await page.getByRole("textbox", { name: /Amount/ }).fill("5000");
    await page.getByRole("textbox", { name: "Reference" }).fill(`EP-E2E-${tag}`);
    await page.getByRole("button", { name: "Send float" }).last().click();
    await expect(page.getByText("Float sent — waiting for the holder to confirm")).toBeVisible();

    // 2. Rafaqat acknowledges it
    const munshi = await munshiSignIn(browser);
    await munshi.goto(`/projects/${projectId}/cash-book/floats`);
    await munshi.getByRole("button", { name: /Mil gaye/ }).first().click();
    await expect(munshi.getByText("Rs 5,000 received")).toBeVisible();
    await munshi.goto(`/projects/${projectId}/cash-book/kharcha`);
    const balance = munshi.getByTestId("cash-balance");
    await expect(balance).toBeVisible();
    const before = rupees(await balance.textContent());
    expect(before).toBeGreaterThanOrEqual(5000);

    // 3. Shahid joins the site and is marked present today
    await munshi.goto(`/projects/${projectId}/labor/team`);
    await munshi.getByRole("button", { name: "Assign worker" }).click();
    await pick(munshi, "Worker", "Shahid");
    await munshi.getByRole("button", { name: "Add to site" }).click();
    await expect(munshi.getByText("Worker added to the site")).toBeVisible();
    await munshi.goto(`/projects/${projectId}/labor/hazri`);
    await munshi.getByRole("button", { name: "Mark today present" }).click();
    await munshi.getByRole("button", { name: "Save hazri" }).click();
    await expect(munshi.getByText("Hazri saved")).toBeVisible();

    // 4. Rs 500 peshgi to Shahid from site cash
    await munshi.goto(`/projects/${projectId}/labor/peshgi`);
    await munshi.getByRole("button", { name: "Give peshgi" }).first().click();
    await pick(munshi, "Worker", "Shahid");
    await munshi.getByRole("textbox", { name: /Amount/ }).fill("500");
    await munshi.getByRole("button", { name: "Save peshgi" }).click();
    await expect(munshi.getByText("Peshgi saved")).toBeVisible();

    // 5. Generate this week and submit it
    await munshi.goto(`/projects/${projectId}/labor/settlements`);
    await munshi.getByRole("button", { name: "Generate" }).click();
    await expect(munshi).toHaveURL(/\/labor\/settlements\/[0-9a-f-]{36}$/);
    const settlementUrl = munshi.url();
    await expect(munshi.getByRole("cell", { name: "Shahid" })).toBeVisible();
    await munshi.getByRole("button", { name: "Submit for approval" }).click();
    await expect(munshi.getByText("Submitted for approval")).toBeVisible();

    // 6. Bilal (PM) approves
    const pmContext = await browser.newContext();
    const pm = await pmContext.newPage();
    await signIn(pm, SEED.pm);
    await pm.goto(new URL(settlementUrl).pathname);
    await pm.getByRole("button", { name: "Approve" }).click();
    await expect(pm.getByText("Approved — wages can be paid")).toBeVisible();
    await pmContext.close();

    // 7. Rafaqat pays everyone from site cash; the balance drops by peshgi + wages
    await munshi.goto(new URL(settlementUrl).pathname);
    await munshi.getByRole("button", { name: "Pay all" }).click();
    await munshi.getByRole("dialog").getByRole("button", { name: /^Pay Rs/ }).click();
    await expect(munshi.getByText(/^Paid Rs/)).toBeVisible();
    await munshi.goto(`/projects/${projectId}/cash-book/kharcha`);
    await expect(balance).toBeVisible();
    const after = rupees(await balance.textContent());
    // Shahid: 1 day × Rs 1,600 = 1,600 wages; Rs 500 was given as peshgi, Rs 1,100 paid now
    expect(before - after).toBe(1600);
    await munshi.context().close();
  } finally {
    await cleanUpProject(page, projectId);
  }
});
