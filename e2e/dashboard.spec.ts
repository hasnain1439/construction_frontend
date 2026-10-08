import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { cleanUpProject, SEED, signIn } from "./helpers";

async function json<T>(res: Awaited<ReturnType<APIRequestContext["get"]>>): Promise<T> {
  expect(res.ok(), `${res.url()} → ${res.status()} ${await res.text()}`).toBeTruthy();
  return ((await res.json()) as { data: T }).data;
}

const todayPK = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);

/** A small ACTIVE project for this run (Bilal PM) so the test can run any number of times. */
async function createSite(api: APIRequestContext, tag: string, pmId: string) {
  const p = await json<{ id: string; code: string }>(
    await api.post("/api/v1/projects", {
      data: {
        name: `E2E dashboard ${tag}`,
        newClient: { name: `E2E Owner ${tag}`, phone: `0323-7${tag}` },
        siteAddress: "Plot 3, E2E Block",
        city: "Lahore",
        startDate: "2026-09-01",
        endDate: "2027-06-30",
      },
    }),
  );
  await json(
    await api.patch(`/api/v1/projects/${p.id}/contract`, {
      data: { contractType: "FULL", billingModel: "STAGE_SCHEDULE", contractValuePaisa: "500000000" },
    }),
  );
  const plot = await json<{ floors: Array<{ id: string }> }>(
    await api.patch(`/api/v1/projects/${p.id}/plot-structure`, {
      data: {
        plotUnit: "MARLA",
        plotSize: 5,
        frontFt: 25,
        depthFt: 45,
        structureType: "FRAMED",
        hasBasement: false,
        floors: [{ level: "GROUND", ceilingHeightFt: 11 }],
      },
    }),
  );
  await json(
    await api.patch(`/api/v1/projects/${p.id}/coverage`, {
      data: { coveredAreaSqft: 1000, boundaryWall: false },
    }),
  );
  await json(
    await api.post(`/api/v1/floors/${plot.floors[0].id}/rooms`, {
      data: { type: "TV_LOUNGE", lengthFt: 30, widthFt: 28 },
    }),
  );
  await json(await api.put(`/api/v1/projects/${p.id}/team`, { data: { pmId, munshiIds: [] } }));
  await json(await api.post(`/api/v1/projects/${p.id}/activate`));
  return json<{ id: string; code: string }>(await api.get(`/api/v1/projects/${p.id}`));
}

/** The number on the "Pending approvals" KPI. */
async function pendingApprovals(page: Page) {
  const kpi = page.getByRole("link", { name: /Pending approvals/ });
  await expect(kpi).toBeVisible({ timeout: 30_000 });
  return Number(/Pending approvals\s*(\d+)/.exec((await kpi.textContent()) ?? "")?.[1]);
}

test("dashboard KPIs → My Approvals bulk approve (kharcha + measurement) → Supplier Ageing Excel → bell marks the bounced cheque read", async ({
  page,
  playwright,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const tag = Date.now().toString().slice(-6);
  const today = todayPK();
  page.context().on("page", (popup) => void popup.close()); // exported files open in a new tab

  await signIn(page, SEED.thekedar);
  const api = page.request;
  const users = await json<Array<{ id: string; name: string }>>(
    await api.get("/api/v1/users?limit=100&status=ACTIVE"),
  );
  const bilal = users.find((u) => u.name === SEED.pm.name)!;
  const site = await createSite(api, tag, bilal.id);
  let invoiceId: string | null = null;
  try {
    // ─── Setup through the API: kharcha above the limit, a measurement, a bounced cheque ───
    const pm = await playwright.request.newContext({ baseURL });
    await json(
      await pm.post("/api/v1/auth/login", {
        data: { login: SEED.pm.login, password: SEED.pm.password, client: "web" },
      }),
    );
    // Above the company's kharcha approval limit, so it waits for approval.
    const settings = await json<{ kharchaApprovalLimitPaisa: string }>(
      await api.get("/api/v1/company/settings"),
    );
    const amount = String(BigInt(settings.kharchaApprovalLimitPaisa) + BigInt(100000));
    const float = await json<{ id: string }>(
      await api.post("/api/v1/cash-floats", {
        data: { holderUserId: bilal.id, amountPaisa: amount, method: "CASH", projectId: site.id },
      }),
    );
    await json(await pm.post(`/api/v1/cash-floats/${float.id}/acknowledge`));
    const kharcha = `E2E generator repair ${tag}`;
    const expense = await json<{ status: string }>(
      await pm.post("/api/v1/cash-expenses", {
        data: { projectId: site.id, category: "REPAIRS", amountPaisa: amount, description: kharcha },
      }),
    );
    expect(expense.status).toBe("PENDING_APPROVAL");
    const subs = await json<Array<{ id: string; name: string }>>(
      await api.get("/api/v1/subcontractors?limit=100"),
    );
    const sharif = subs.find((s) => s.name === "Ustad Sharif Shuttering")!;
    const assignment = await json<{ id: string }>(
      await api.post(`/api/v1/projects/${site.id}/labor/subcontracts`, {
        data: {
          subcontractorId: sharif.id,
          scope: `E2E slab ${tag}`,
          rateType: "PER_SQFT",
          ratePaisa: "4500",
          startDate: today,
        },
      }),
    );
    await json(
      await pm.post(`/api/v1/projects/${site.id}/work-measurements`, {
        data: { assignmentId: assignment.id, date: today, description: `E2E slab ${tag}`, quantity: 10 },
      }),
    );
    await pm.dispose();

    const stages = await json<Array<{ id: string }>>(
      await api.get(`/api/v1/projects/${site.id}/billing-stages`),
    );
    const draft = await json<{ id: string }>(
      await api.post(`/api/v1/projects/${site.id}/invoices`, {
        data: { type: "STAGE", billingStageId: stages[0].id, force: true, forceNote: "E2E dashboard" },
      }),
    );
    invoiceId = draft.id;
    await json(await api.post(`/api/v1/invoices/${draft.id}/issue`, { data: {} }));
    const cheque = await json<{ id: string }>(
      await api.post(`/api/v1/projects/${site.id}/payments`, {
        data: {
          receivedOn: today,
          method: "CHEQUE",
          amountPaisa: "10000000",
          bankName: "HBL",
          chequeNo: `D${tag}`,
          allocations: [{ invoiceId: draft.id, amountPaisa: "10000000" }],
        },
      }),
    );
    await json(
      await api.patch(`/api/v1/payments/${cheque.id}/cheque-status`, {
        data: { status: "BOUNCED", reason: "insufficient funds" },
      }),
    );

    // ─── 1. Dashboard KPIs ───
    await page.goto("/dashboard");
    await expect(page.getByText("Receivables", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Supplier udhaar")).toBeVisible();
    await expect(page.getByText("Projects summary")).toBeVisible();
    const before = await pendingApprovals(page);
    expect(before).toBeGreaterThanOrEqual(2);

    // ─── 2. My Approvals: select the kharcha and the measurement, approve both at once ───
    await page.getByRole("link", { name: /Pending approvals/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/approvals$/);
    const expenseItem = page.getByRole("listitem").filter({ hasText: kharcha });
    const measureItem = page
      .getByRole("listitem")
      .filter({ hasText: "Ustad Sharif Shuttering: 10 sqft" })
      .filter({ hasText: site.code });
    await expenseItem.getByRole("checkbox").check();
    await measureItem.getByRole("checkbox").check();
    const bar = page.getByRole("region", { name: "Bulk actions" });
    await expect(bar).toContainText("2 selected");
    await bar.getByRole("button", { name: "Approve (2)" }).click();
    await expect(page.getByText("2 done").first()).toBeVisible();
    await expect(expenseItem).toHaveCount(0);
    await expect(measureItem).toHaveCount(0);
    await page.goto("/dashboard");
    await expect.poll(() => pendingApprovals(page), { timeout: 30_000 }).toBe(before - 2);

    // ─── 3. Supplier Ageing → Excel: the API answers with a signed link ───
    await page.goto("/reports/supplier-ageing");
    await expect(page.getByRole("heading", { level: 1, name: "Supplier Ageing" })).toBeVisible();
    await expect(page.getByText(/\d+ rows?/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /Export/ }).click();
    const [exported] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/v1/reports/supplier-ageing") && r.url().includes("format=xlsx"),
      ),
      page.getByRole("menuitem", { name: "Excel" }).click(),
    ]);
    const file = ((await exported.json()) as { data: { url: string; fileName: string; expiresAt: string } })
      .data;
    expect(file.url).toMatch(/^https?:\/\//);
    expect(file.fileName).toMatch(/^supplier-ageing-\d{4}-\d{2}-\d{2}\.xlsx$/);

    // ─── 4. Bell: the bounced cheque is there; marking it read lowers the count ───
    await page.goto("/dashboard");
    const badge = page.getByTestId("notification-badge");
    await expect(badge).toBeVisible({ timeout: 30_000 });
    const unread = Number(await badge.textContent());
    await page.getByRole("button", { name: /Notifications: \d+ unread/ }).click();
    const note = page.getByRole("listitem").filter({ hasText: `Cheque bounced — ${`E2E dashboard ${tag}`}` });
    await expect(note).toBeVisible();
    await note.getByRole("button", { name: /as read/ }).click();
    await expect(badge).toHaveText(String(unread - 1));
  } finally {
    // Leave the dev data tidy: cancelling the invoice closes the bounce alert; the project is handed over.
    if (invoiceId)
      await page.request.post(`/api/v1/invoices/${invoiceId}/cancel`, { data: { reason: "E2E clean-up" } });
    await cleanUpProject(page, site.id);
  }
});
