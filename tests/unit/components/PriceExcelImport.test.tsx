import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PriceImportPreview } from "@/api/types";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const ok = <T,>(value: T) => ({ unwrap: () => Promise.resolve(value) });
const calls = { download: vi.fn(), preview: vi.fn(), commit: vi.fn() };
let preview: PriceImportPreview;

vi.mock("@/api/services/masterData.api", () => ({
  useDownloadPriceListMutation: () => [() => (calls.download(), ok(null)), { isLoading: false }],
  usePreviewPriceImportMutation: () => [
    (file: File) => (calls.preview(file), ok(preview)),
    { isLoading: false },
  ],
  useCommitPriceImportMutation: () => [
    (arg: { file: File; skipInvalid?: boolean }) => (
      calls.commit(arg),
      ok({
        fileName: arg.file.name,
        changed: arg.skipInvalid ? 1 : preview.changedCount,
        unchanged: preview.unchangedCount,
        skipped: arg.skipInvalid ? preview.errorCount : 0,
        categories: [],
      })
    ),
    { isLoading: false },
  ],
}));

const { PriceImportButton } = await import("@/features/master-data/components/PriceExcelImport");

const STD = { id: "cat-std", name: "A Standard", code: "A_STD" };
const ECO = { id: "cat-eco", name: "B Economy", code: "B_ECO" };

const PREVIEW: PriceImportPreview = {
  fileName: "price-list-2026-10-20.xlsx",
  categories: [STD, ECO],
  totalRows: 40,
  changedCount: 2,
  unchangedCount: 100,
  errorCount: 0,
  changes: [
    {
      rowNumber: 2,
      material: { id: "m-cement", name: "Cement OPC", unit: "bag", group: "Cement" },
      category: STD,
      oldRatePaisa: "145000",
      diffPaisa: "5000",
      diffPercent: 3.45,
      newRatePaisa: "150000",
      oldSpecification: "Lucky / Maple Leaf",
      newSpecification: "Lucky / Maple Leaf",
      rateChanged: true,
      specChanged: false,
    },
    {
      rowNumber: 3,
      material: { id: "m-bricks", name: "Clay bricks Class-1", unit: "piece", group: "Bricks" },
      category: ECO,
      oldRatePaisa: "1400",
      diffPaisa: "-200",
      diffPercent: -14.29,
      newRatePaisa: "1200",
      oldSpecification: "Doom",
      newSpecification: "Doom (2nd grade)",
      rateChanged: true,
      specChanged: true,
    },
  ],
  errors: [],
};

const file = () =>
  new File(["x"], "price-list-2026-10-20.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
const input = () => screen.getByLabelText("Upload the edited price list file") as HTMLInputElement;
const currentStep = (dialog: HTMLElement) => dialog.querySelector('[aria-current="step"]')?.textContent;

/** Clicks the toolbar button and returns the popup. */
async function openPopup(user: ReturnType<typeof userEvent.setup>, name = "Import from Excel") {
  await user.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog");
}

beforeEach(() => {
  for (const fn of [...Object.values(calls), toast.success, toast.error]) fn.mockReset();
  preview = PREVIEW;
});

describe("PriceImportButton", () => {
  it(
    "popup: download → upload → preview grouped by category with up / down → import → “N rates updated”",
    { timeout: 20_000 },
    async () => {
      const user = userEvent.setup();
      renderWithStore(<PriceImportButton />, { me: meFixture("THEKEDAR") });

      const dialog = await openPopup(user);
      expect(within(dialog).getByText("Import rates from Excel")).toBeInTheDocument();
      expect(currentStep(dialog)).toBe("1Template");
      expect(within(dialog).getByText(/Change only the numbers — an empty cell means no change/)).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Import changes (0)" })).toBeDisabled();

      await user.click(within(dialog).getByRole("button", { name: "Download rates (Excel)" }));
      expect(calls.download).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Price list downloaded"));

      const chosen = file();
      await user.upload(input(), chosen);
      expect(calls.preview).toHaveBeenCalledWith(chosen);

      expect(await within(dialog).findByText("2 changing · 100 unchanged · 0 with problems")).toBeInTheDocument();
      expect(currentStep(dialog)).toBe("3Check");
      expect(within(dialog).getByText("Everything looks right.")).toBeInTheDocument();
      expect(within(dialog).getByText("A Standard (1)")).toBeInTheDocument();
      expect(within(dialog).getByText("B Economy (1)")).toBeInTheDocument();
      expect(within(dialog).queryByLabelText(/Import only the changes/)).not.toBeInTheDocument();

      const std = within(dialog).getByRole("region", { name: "A Standard" });
      expect(within(std).getByText("Cement OPC")).toBeInTheDocument();
      expect(within(std).queryByText("Clay bricks Class-1")).not.toBeInTheDocument();
      const up = std.querySelector('[data-direction="up"]')!;
      expect(up).toHaveClass("text-danger");
      expect(up.textContent).toContain("(+3.45%)");
      expect(within(std).getByLabelText("Up")).toBeInTheDocument();

      const eco = within(dialog).getByRole("region", { name: "B Economy" });
      const down = eco.querySelector('[data-direction="down"]')!;
      expect(down).toHaveClass("text-success");
      expect(down.textContent).toContain("(-14.29%)");
      expect(within(eco).getByText("Doom → Doom (2nd grade)")).toBeInTheDocument();

      await user.click(within(dialog).getByRole("button", { name: "Import changes (2)" }));
      expect(calls.commit).toHaveBeenCalledWith({ file: chosen });
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("2 rates updated"));

      // Done step: success state in the popup, then Close.
      expect(within(dialog).getByText("2 rates updated")).toBeInTheDocument();
      expect(currentStep(dialog)).toBe("4Done");
      const closeButtons = within(dialog).getAllByRole("button", { name: "Close" });
      expect(closeButtons.length).toBe(2); // the panel’s X and the footer button
      await user.click(closeButtons[closeButtons.length - 1]!);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    },
  );

  it("lists the problems; importing needs “only the changes without problems” (skipInvalid)", async () => {
    const user = userEvent.setup();
    preview = {
      ...PREVIEW,
      changedCount: 1,
      errorCount: 2,
      changes: [PREVIEW.changes[0]!],
      errors: [
        {
          rowNumber: 5,
          column: null,
          code: "UNKNOWN_MATERIAL",
          message: "x",
          value: "Granite slab",
          materialName: "Granite slab",
        },
        {
          rowNumber: 6,
          column: "A Standard [A_STD] Rate (Rs)",
          code: "NOT_A_NUMBER",
          message: "x",
          value: "abc",
          materialName: "Chenab sand",
        },
      ],
    };
    renderWithStore(<PriceImportButton />, { me: meFixture("THEKEDAR") });
    const dialog = await openPopup(user);
    const chosen = file();
    await user.upload(input(), chosen);

    expect(await within(dialog).findByText("1 changing · 100 unchanged · 2 with problems")).toBeInTheDocument();
    const errors = within(dialog).getByTestId("price-import-errors");
    expect(within(dialog).getByText("Problems in the file (2)")).toBeInTheDocument();
    expect(errors).toHaveTextContent("Row 5: “Granite slab” is not in your materials");
    expect(errors).toHaveTextContent(
      "Row 6 · Chenab sand · A Standard [A_STD] Rate (Rs): “abc” is not a number",
    );

    expect(within(dialog).getByRole("button", { name: "Import changes (0)" })).toBeDisabled();
    await user.click(within(dialog).getByLabelText("Import only the changes without problems (1)"));
    await user.click(within(dialog).getByRole("button", { name: "Import changes (1)" }));
    expect(calls.commit).toHaveBeenCalledWith({ file: chosen, skipInvalid: true });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("1 rate updated"));
    expect(within(dialog).getByText("Skipped because of problems: 2")).toBeInTheDocument();
  });

  it("a file without changes cannot be imported; “Choose another file” goes back to the upload", async () => {
    const user = userEvent.setup();
    preview = { ...PREVIEW, changedCount: 0, changes: [] };
    renderWithStore(<PriceImportButton />, { me: meFixture("THEKEDAR") });
    const dialog = await openPopup(user);
    await user.upload(input(), file());
    expect(await within(dialog).findByText("No rate or specification changed in this file.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Import changes (0)" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Choose another file" }));
    expect(within(dialog).queryByText("No rate or specification changed in this file.")).not.toBeInTheDocument();
    expect(currentStep(dialog)).toBe("1Template");
    expect(calls.commit).not.toHaveBeenCalled();
  });

  it("a PM (view + rates, no manage) may only download; without fields.rates there is nothing", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithStore(<PriceImportButton />, { me: meFixture("PM") });
    expect(screen.queryByRole("button", { name: "Import from Excel" })).not.toBeInTheDocument();
    const dialog = await openPopup(user, "Download rates (Excel)");
    expect(within(dialog).getByText("Price list in Excel")).toBeInTheDocument();
    expect(within(dialog).getByText("Only the owner or an admin can upload the edited file.")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Upload the edited price list file")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Import changes/ })).not.toBeInTheDocument();
    expect(dialog.querySelector('[aria-current="step"]')).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Download rates (Excel)" }));
    expect(calls.download).toHaveBeenCalledTimes(1);
    unmount();

    renderWithStore(<PriceImportButton />, { me: meFixture("PM", { deny: ["fields.rates"] }) });
    expect(screen.queryByRole("button", { name: /Excel/ })).not.toBeInTheDocument();
  });
});
