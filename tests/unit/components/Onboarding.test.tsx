import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportPreview, SetupChecklist as Checklist } from "@/api/types";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

const ok = <T,>(value: T) => ({ unwrap: () => Promise.resolve(value) });
const calls = {
  dismiss: vi.fn(),
  rates: vi.fn(),
  createDemo: vi.fn(),
  deleteDemo: vi.fn(),
  download: vi.fn(),
  preview: vi.fn(),
  commit: vi.fn(),
};
let checklist: Checklist;
let preview: ImportPreview;

vi.mock("@/api/services/onboarding.api", () => ({
  useGetSetupChecklistQuery: (_arg: unknown, opts?: { skip?: boolean }) => ({
    data: opts?.skip ? undefined : checklist,
  }),
  useDismissSetupChecklistMutation: () => [
    (arg: unknown) => (calls.dismiss(arg), ok(checklist)),
    { isLoading: false },
  ],
  useMarkRatesReviewedMutation: () => [() => (calls.rates(), ok(checklist)), { isLoading: false }],
  useCreateDemoMutation: () => [
    () => (
      calls.createDemo(),
      ok({ project: { id: "d1", code: "DEMO-001", name: "DEMO · Sample house", isDemo: true }, counts: {} })
    ),
    { isLoading: false },
  ],
  useDeleteDemoMutation: () => [() => (calls.deleteDemo(), ok({ removed: true })), { isLoading: false }],
  useDownloadImportTemplateMutation: () => [
    (entity: string) => (calls.download(entity), ok(null)),
    { isLoading: false },
  ],
  usePreviewImportMutation: () => [(arg: unknown) => (calls.preview(arg), ok(preview)), { isLoading: false }],
  useCommitImportMutation: () => [
    (arg: { skipInvalid?: boolean }) => (
      calls.commit(arg),
      ok({
        entity: "workers",
        fileName: "workers.csv",
        created: 1,
        skipped: arg.skipInvalid ? 1 : 0,
        ids: ["w1"],
      })
    ),
    { isLoading: false },
  ],
}));

const { SetupChecklist } = await import("@/features/onboarding/components/SetupChecklist");
const { ImportWizard } = await import("@/features/onboarding/components/ImportWizard");

const BASE: Checklist = {
  steps: [
    { key: "LOGO", done: true },
    { key: "RATES", done: false },
    { key: "TEAM", done: true },
    { key: "WORKERS", done: false },
    { key: "SUPPLIERS", done: false },
    { key: "PROJECT", done: false },
  ],
  completed: 2,
  total: 6,
  percent: 33,
  allDone: false,
  dismissed: false,
  dismissedAt: null,
  ratesReviewedAt: null,
  counts: { workers: 0, suppliers: 0, projects: 0, teamUsers: 1, pendingOrSentInvites: 0 },
  demo: null,
};

beforeEach(() => {
  for (const fn of Object.values(calls)) fn.mockReset();
  checklist = BASE;
});

describe("SetupChecklist", () => {
  it("owner: progress, a link per step, rates confirmation, opening balances, demo and hide", async () => {
    const user = userEvent.setup();
    renderWithStore(<SetupChecklist />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Set up your company")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "2 of 6 steps done" })).toHaveAttribute(
      "aria-valuenow",
      "33",
    );
    expect(screen.getByRole("link", { name: "Add your company logo" })).toHaveAttribute(
      "href",
      "/settings/company",
    );
    expect(screen.getByRole("link", { name: "Add your workers" })).toHaveAttribute(
      "href",
      "/workforce/workers?new=1",
    );
    expect(screen.getAllByRole("link", { name: "or import from Excel" })[0]).toHaveAttribute(
      "href",
      "/workforce/workers?import=1",
    );
    expect(screen.getByRole("link", { name: "Create your first project" })).toHaveAttribute(
      "href",
      "/projects/new",
    );
    expect(screen.getByRole("link", { name: /Enter opening balances/ })).toHaveAttribute(
      "href",
      "/settings/opening-balances",
    );

    // Owner decision 5: optional next steps (links only, not counted in the progress) — quote,
    // estimate, rulebook, equipment first; the rest under a collapsed "Show more"
    expect(screen.getByText("Optional next steps")).toBeInTheDocument();
    const first = screen.getByTestId("optional-steps");
    expect(within(first).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Create your first quote",
      "Make the estimate (BoQ) of a project",
      "Review the rulebook values (wastage, mixes, labour rates)",
      "Add your shuttering and equipment",
    ]);
    expect(screen.getByRole("link", { name: "Create your first quote" })).toHaveAttribute("href", "/sales/quotes/new");
    // no project yet → the estimate starts with a new project
    expect(screen.getByRole("link", { name: "Make the estimate (BoQ) of a project" })).toHaveAttribute("href", "/projects/new");
    expect(screen.getByRole("link", { name: /Review the rulebook values/ })).toHaveAttribute("href", "/settings/rulebook");
    expect(screen.getByRole("link", { name: "Add your shuttering and equipment" })).toHaveAttribute("href", "/equipment/owned");
    // "Show more" is closed by default
    expect(screen.queryByRole("link", { name: /Check the tax settings/ })).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    // without a project the project-page steps (schedule, change orders, closeout) have nowhere to go
    expect(within(screen.getByTestId("optional-steps-more")).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Set the alert limits (overuse, delays, spending)",
      "Check the tax settings (PRA / SRB / ICT, WHT)",
    ]);
    expect(screen.getByRole("link", { name: /Check the tax settings/ })).toHaveAttribute("href", "/settings/tax");
    expect(screen.getByRole("link", { name: /Set the alert limits/ })).toHaveAttribute("href", "/settings/alerts");

    await user.click(screen.getByRole("button", { name: "My rates are fine" }));
    expect(calls.rates).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Try with demo data" }));
    expect(calls.createDemo).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(calls.dismiss).toHaveBeenCalledWith({ dismissed: true });
  });

  it("owner decision 5: with a project, estimate / schedule / change orders / closeout open it; each step follows its permission", async () => {
    const user = userEvent.setup();
    checklist = { ...BASE, latestProject: { id: "p9", code: "MSB-2026-009", name: "Johar Town" } };
    const { unmount } = renderWithStore(<SetupChecklist />, { me: meFixture("THEKEDAR") });
    expect(screen.getByRole("link", { name: "Make the estimate (BoQ) of a project" })).toHaveAttribute("href", "/projects/p9/planning/estimate");
    await user.click(screen.getByRole("button", { name: "Show more" }));
    const more = screen.getByTestId("optional-steps-more");
    expect(within(more).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Plan the work schedule of a project", "/projects/p9/schedule/gantt"],
      ["Set the alert limits (overuse, delays, spending)", "/settings/alerts"],
      ["Record changes the owner asks for (change orders)", "/projects/p9/change-orders"],
      ["Hand a finished project over (closeout)", "/projects/p9/documents/handover"],
      ["Check the tax settings (PRA / SRB / ICT, WHT)", "/settings/tax"],
    ]);
    unmount();

    // a user without a step's key never sees that step (only the keys listed here)
    renderWithStore(<SetupChecklist />, {
      me: meFixture("PM", { permissions: ["company.settings.manage", "projects.estimate.view", "rulebook.override.view", "equipment.view", "schedule.plan.view"] }),
    });
    expect(screen.queryByRole("link", { name: "Create your first quote" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Add your shuttering and equipment" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.queryByRole("link", { name: /Check the tax settings/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /change orders/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Plan the work schedule of a project" })).toBeInTheDocument();
  });

  it("with demo data: DEMO badge, link to the project, remove after confirming", async () => {
    const user = userEvent.setup();
    checklist = {
      ...BASE,
      demo: {
        id: "d1",
        code: "DEMO-001",
        name: "DEMO · Sample house",
        createdAt: "2026-10-13T09:00:00.000Z",
      },
    };
    renderWithStore(<SetupChecklist />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("DEMO")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DEMO · Sample house" })).toHaveAttribute(
      "href",
      "/projects/d1/overview",
    );
    await user.click(screen.getByRole("button", { name: "Remove demo data" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove demo data" }));
    expect(calls.deleteDemo).toHaveBeenCalledOnce();
  });

  it("hidden: nothing but the demo controls; never shown to a PM", () => {
    checklist = { ...BASE, dismissed: true };
    const { container, unmount } = renderWithStore(<SetupChecklist />, { me: meFixture("THEKEDAR") });
    expect(container).toBeEmptyDOMElement();
    unmount();
    checklist = BASE;
    const pm = renderWithStore(<SetupChecklist />, { me: meFixture("PM") });
    expect(pm.container).toBeEmptyDOMElement();
  });

  it("Urdu: right-to-left text from the dictionary", () => {
    renderWithStore(<SetupChecklist />, { me: meFixture("THEKEDAR"), ui: { language: "ur" } });
    expect(screen.getByText("اپنی کمپنی سیٹ اپ کریں")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ڈیمو ڈیٹا سے آزمائیں" })).toBeInTheDocument();
  });
});

describe("ImportWizard", () => {
  const PREVIEW: ImportPreview = {
    entity: "workers",
    fileName: "workers.csv",
    columns: [
      { key: "name", label: "Name", labelRoman: "Naam", labelUrdu: "نام", required: true },
      {
        key: "type",
        label: "Worker type",
        labelRoman: "Kaam ki qisam",
        labelUrdu: "کام کی قسم",
        required: true,
      },
    ],
    unknownColumns: ["Father name"],
    skippedExampleRows: 1,
    totalRows: 2,
    validRows: 1,
    invalidRows: 1,
    rows: [
      { rowNumber: 3, values: { name: "Riaz Ahmed", type: "MAZDOOR" }, errors: [], valid: true },
      {
        rowNumber: 4,
        values: { name: "Kashif", type: "PLUMBER" },
        errors: [{ column: "type", message: "Unknown worker type" }],
        valid: false,
      },
    ],
  };

  it(
    "template → upload → preview with row problems → all-or-nothing, or import only the good rows",
    { timeout: 20_000 },
    async () => {
      const user = userEvent.setup();
      preview = PREVIEW;
      renderWithStore(<ImportWizard entity="workers" open onOpenChange={() => undefined} />, {
        me: meFixture("THEKEDAR"),
      });
      expect(screen.getByText("Import workers from Excel")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Download template" }));
      expect(calls.download).toHaveBeenCalledWith("workers");

      const file = new File(["Name,Worker type\nRiaz Ahmed,MAZDOOR\nKashif,PLUMBER\n"], "workers.csv", {
        type: "text/csv",
      });
      await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
      expect(calls.preview).toHaveBeenCalledWith({ entity: "workers", file });
      expect((await screen.findAllByText("1 ready · 1 with problems"))[0]).toBeInTheDocument();
      expect(screen.getByText("The example row was skipped.")).toBeInTheDocument();
      expect(screen.getByText("These columns were ignored: Father name")).toBeInTheDocument();

      // Only the problem row is listed at first, with its error next to the column.
      expect(screen.getByText("Kashif")).toBeInTheDocument();
      expect(screen.queryByText("Riaz Ahmed")).not.toBeInTheDocument();
      expect(screen.getByText("PLUMBER")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText(/Unknown worker type/)).toBeInTheDocument();
      await user.click(screen.getByLabelText("Only rows with problems"));
      expect(screen.getByText("Riaz Ahmed")).toBeInTheDocument();

      // All-or-nothing: nothing can be imported until the bad rows are skipped.
      expect(screen.getByRole("button", { name: "Import 0 rows" })).toBeDisabled();
      await user.click(screen.getByLabelText("Import only the 1 good rows (skip 1 with problems)"));
      await user.click(screen.getByRole("button", { name: "Import 1 row" }));
      expect(calls.commit).toHaveBeenCalledWith({ entity: "workers", file, skipInvalid: true });
      await waitFor(() => expect(screen.getAllByText("1 imported, 1 skipped").length).toBeGreaterThan(0));
      expect(screen.getAllByRole("button", { name: "Close" }).length).toBe(2); // the panel’s X and the footer button
    },
  );

  it("a clean file imports every row in one go", async () => {
    const user = userEvent.setup();
    preview = {
      ...PREVIEW,
      unknownColumns: [],
      skippedExampleRows: 0,
      validRows: 2,
      invalidRows: 0,
      rows: PREVIEW.rows.map((r) => ({ ...r, errors: [], valid: true })),
    };
    renderWithStore(<ImportWizard entity="workers" open onOpenChange={() => undefined} />, {
      me: meFixture("THEKEDAR"),
    });
    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      new File(["x"], "w.csv", { type: "text/csv" }),
    );
    expect(await screen.findByText("All 2 rows are ready to import.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Import only the/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import 2 rows" }));
    expect(calls.commit).toHaveBeenCalledWith(expect.objectContaining({ skipInvalid: false }));
  });
});
