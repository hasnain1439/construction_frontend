import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { cleanUpProject, SEED, signIn } from "./helpers";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function json<T>(res: Awaited<ReturnType<APIRequestContext["get"]>>): Promise<T> {
  expect(res.ok(), `${res.url()} → ${res.status()} ${await res.text()}`).toBeTruthy();
  return ((await res.json()) as { data: T }).data;
}

/** A small ACTIVE project (Rs 50,00,000, standard stages) for this run. */
async function createSite(api: APIRequestContext, tag: string) {
  const p = await json<{ id: string }>(
    await api.post("/api/v1/projects", {
      data: { name: `E2E billing ${tag}`, newClient: { name: `E2E Owner ${tag}`, phone: `0322-8${tag}` }, siteAddress: "Plot 2, E2E Block", city: "Lahore", startDate: "2026-09-01", endDate: "2027-06-30" },
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
  await json(await api.post(`/api/v1/projects/${p.id}/activate`));
  return p.id;
}

async function billStage(page: Page, projectId: string, stage: string) {
  await page.goto(`/projects/${projectId}/billing/schedule`);
  const row = page.getByRole("row").filter({ hasText: stage });
  await row.getByRole("button", { name: "Mark ready" }).click();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "stage.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("stage.png").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark ready" }).last().click();
  await expect(page.getByText(`${stage} is ready to bill`)).toBeVisible();
  await row.getByRole("button", { name: "Create invoice" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/billing\/invoices\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Issue", exact: true }).click();
  await page.getByRole("button", { name: "Issue invoice" }).click();
  const issued = page.getByText(/INV-\d{4}-\d{4} issued/);
  await expect(issued).toBeVisible();
  return { url: page.url(), number: (await issued.textContent())!.match(/INV-\d{4}-\d{4}/)![0] };
}

async function recordCheque(page: Page, projectId: string, amount: string, chequeNo: string) {
  await page.goto(`/projects/${projectId}/billing/payments`);
  await page.getByRole("button", { name: "Record payment" }).click();
  await page.getByRole("textbox", { name: /^Amount/ }).first().fill(amount);
  await page.getByRole("combobox", { name: /Method/ }).click();
  await page.getByRole("option", { name: "Cheque" }).click();
  await page.getByRole("textbox", { name: /Bank/ }).fill("MCB");
  await page.getByRole("textbox", { name: /Cheque no/ }).fill(chequeNo);
  await page.getByRole("button", { name: "Save payment" }).click();
  await expect(page.getByText(/RV-\d{4}-\d{4} saved — cheque pending/)).toBeVisible();
  return page.getByRole("row").filter({ hasText: `#${chequeNo}` });
}

test("stage ready → invoice issued → cheque cleared (PAID) → second cheque bounced → balance back + dashboard alert", async ({ page }) => {
  test.setTimeout(240_000);
  const tag = Date.now().toString().slice(-6);
  await signIn(page, SEED.thekedar);
  const projectId = await createSite(page.request, tag);
  let bouncedInvoice: string | null = null;
  try {
    // 1. Agreement stage (15% = Rs 7,50,000): ready → invoice → issue
    const first = await billStage(page, projectId, "Agreement & mobilisation");

    // 2. Cheque → pending; cleared → invoice PAID, receivables move
    const row = await recordCheque(page, projectId, "750000", `E${tag}1`);
    await expect(row.getByText("Cheque pending")).toBeVisible();
    await row.getByRole("button", { name: "Mark cleared" }).click();
    await page.getByRole("button", { name: "Mark cleared" }).last().click();
    await expect(page.getByText("Cheque cleared")).toBeVisible();
    await page.goto(first.url);
    await expect(page.getByText("Paid").first()).toBeVisible();
    await expect(page.getByTestId("invoice-balance")).toHaveText("Rs 0");
    const after = await json<{ receivedPaisa: string; outstandingPaisa: string }>(await page.request.get(`/api/v1/projects/${projectId}/receivables`));
    expect(after).toMatchObject({ receivedPaisa: "75000000", outstandingPaisa: "0" });

    // 3. Plinth (15%) → second cheque bounces → the balance is due again and the dashboard warns
    const second = await billStage(page, projectId, "Foundation & plinth");
    bouncedInvoice = second.url.split("/").pop()!;
    const bounced = await recordCheque(page, projectId, "750000", `E${tag}2`);
    await bounced.getByRole("button", { name: "Bounced" }).click();
    await page.getByRole("textbox", { name: /Reason/ }).fill("insufficient funds");
    await page.getByRole("button", { name: "Mark bounced" }).click();
    await expect(page.getByText("Marked bounced — the balance is due again")).toBeVisible();
    await page.goto(second.url);
    await expect(page.getByTestId("invoice-balance")).toHaveText("Rs 7,50,000");

    await page.goto("/dashboard");
    await expect(page.getByRole("list", { name: "Alerts" }).getByRole("listitem").filter({ hasText: `E2E billing ${tag}` }).filter({ hasText: "Cheque bounced" })).toBeVisible({ timeout: 30_000 });
  } finally {
    // Leave the dev data tidy: the unpaid invoice is cancelled (its bounce alert closes with it).
    if (bouncedInvoice) await page.request.post(`/api/v1/invoices/${bouncedInvoice}/cancel`, { data: { reason: "E2E clean-up" } });
    await cleanUpProject(page, projectId);
  }
});
