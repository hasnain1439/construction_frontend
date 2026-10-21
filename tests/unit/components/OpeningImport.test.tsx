import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportPreview } from "@/api/types";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings/opening-balances",
  useSearchParams: () => new URLSearchParams(),
}));

const ok = <T,>(value: T) => ({ unwrap: () => Promise.resolve(value) });
const calls = { download: vi.fn(), preview: vi.fn(), commit: vi.fn() };
let preview: ImportPreview;

vi.mock("@/api/services/onboarding.api", () => ({
  useDownloadImportTemplateMutation: () => [
    (entity: string) => (calls.download(entity), ok(null)),
    { isLoading: false },
  ],
  usePreviewImportMutation: () => [(arg: unknown) => (calls.preview(arg), ok(preview)), { isLoading: false }],
  useCommitImportMutation: () => [
    (arg: { entity: string; skipInvalid?: boolean }) => (
      calls.commit(arg),
      ok({
        entity: arg.entity,
        fileName: "udhaar.xlsx",
        created: 2,
        skipped: arg.skipInvalid ? 1 : 0,
        ids: ["o1", "o2"],
      })
    ),
    { isLoading: false },
  ],
}));

const { OpeningImportButton, OpeningImportWizard } = await import(
  "@/features/onboarding/components/OpeningImport"
);

const PREVIEW: ImportPreview = {
  entity: "opening-udhaar",
  fileName: "udhaar.xlsx",
  columns: [
    { key: "supplier", label: "Supplier", labelRoman: "Supplier", labelUrdu: "سپلائر", required: true },
    { key: "amount", label: "Amount (Rs)", labelRoman: "Raqam (Rs)", labelUrdu: "رقم (روپے)", required: true },
    { key: "date", label: "Date", labelRoman: "Tareekh", labelUrdu: "تاریخ", required: false },
  ],
  unknownColumns: [],
  skippedExampleRows: 1,
  totalRows: 3,
  validRows: 2,
  invalidRows: 1,
  rows: [
    { rowNumber: 3, values: { supplier: "Al-Madina Cement", amount: "74,000", date: "" }, errors: [], valid: true },
    { rowNumber: 4, values: { supplier: "Ravi Steel", amount: "Rs 1,20,000", date: "" }, errors: [], valid: true },
    {
      rowNumber: 5,
      values: { supplier: "Nobody Traders", amount: "0", date: "" },
      errors: [
        { column: "supplier", message: "Unknown supplier" },
        { column: "amount", message: "Amount must be more than zero" },
      ],
      valid: false,
    },
  ],
};

beforeEach(() => {
  for (const fn of Object.values(calls)) fn.mockClear();
  preview = PREVIEW;
});

describe("Opening balances Excel import", () => {
  it(
    "step 1 kind choice → template → upload → check with cell errors → import only the valid rows → done",
    { timeout: 20_000 },
    async () => {
      const user = userEvent.setup();
      renderWithStore(<OpeningImportWizard open onOpenChange={() => undefined} />, { me: meFixture("THEKEDAR") });
      expect(screen.getByText("Import opening balances from Excel")).toBeInTheDocument();
      expect(screen.getByText("What are you importing?")).toBeInTheDocument();
      // The same four steps as every other import
      for (const step of ["Template", "Upload", "Check", "Done"]) expect(screen.getByText(step)).toBeInTheDocument();

      // Store stock is the default kind
      expect(screen.getByRole("radio", { name: /Store stock/ })).toBeChecked();
      await user.click(screen.getByRole("button", { name: "Download template" }));
      expect(calls.download).toHaveBeenLastCalledWith("opening-stock");

      await user.click(screen.getByRole("radio", { name: /Supplier balance/ }));
      await user.click(screen.getByRole("button", { name: "Download template" }));
      expect(calls.download).toHaveBeenLastCalledWith("opening-udhaar");

      const file = new File(["Supplier,Amount\n"], "udhaar.xlsx");
      await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
      expect(calls.preview).toHaveBeenCalledWith({ entity: "opening-udhaar", file });
      expect((await screen.findAllByText("2 ready · 1 with problems"))[0]).toBeInTheDocument();

      // Errors per cell
      expect(screen.getByText("Nobody Traders")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("0")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText(/Unknown supplier/)).toBeInTheDocument();
      expect(screen.getByText(/Amount must be more than zero/)).toBeInTheDocument();

      expect(screen.getByRole("button", { name: "Import 0 rows" })).toBeDisabled();
      await user.click(screen.getByLabelText("Import only the 2 good rows (skip 1 with problems)"));
      await user.click(screen.getByRole("button", { name: "Import 2 rows" }));
      expect(calls.commit).toHaveBeenCalledWith({ entity: "opening-udhaar", file, skipInvalid: true });
      await waitFor(() =>
        expect(screen.getAllByText("2 opening balances added, 1 skipped").length).toBeGreaterThan(0),
      );
      expect(screen.queryByText("What are you importing?")).not.toBeInTheDocument();
    },
  );

  it("changing the kind after a check clears the file; a clean file imports everything", async () => {
    const user = userEvent.setup();
    preview = { ...PREVIEW, entity: "opening-stock", validRows: 1, invalidRows: 0, totalRows: 1, rows: [PREVIEW.rows[0]!] };
    renderWithStore(<OpeningImportWizard open onOpenChange={() => undefined} />, { me: meFixture("THEKEDAR") });
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "stock.xlsx"));
    expect(await screen.findByText("The 1 row is ready to import.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Worker advance/ }));
    expect(screen.queryByText("stock.xlsx")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import 0 rows" })).toBeDisabled();

    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "peshgi.xlsx"));
    expect(calls.preview).toHaveBeenLastCalledWith(expect.objectContaining({ entity: "opening-peshgi" }));
    await user.click(await screen.findByRole("button", { name: "Import 1 row" }));
    expect(calls.commit).toHaveBeenCalledWith(expect.objectContaining({ entity: "opening-peshgi", skipInvalid: false }));
    await waitFor(() => expect(screen.getAllByText("2 opening balances added").length).toBeGreaterThan(0));
  });

  it("Urdu: texts from the dictionary", () => {
    renderWithStore(<OpeningImportWizard open onOpenChange={() => undefined} />, {
      me: meFixture("THEKEDAR"),
      ui: { language: "ur" },
    });
    expect(screen.getByText("ایکسل سے ابتدائی بیلنس امپورٹ کریں")).toBeInTheDocument();
    expect(screen.getByText("کیا امپورٹ کر رہے ہیں؟")).toBeInTheDocument();
  });

  it("the button opens the popup for the owner and is hidden without company.opening.manage", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithStore(<OpeningImportButton />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("button", { name: "Import from Excel" }));
    expect(await screen.findByText("Import opening balances from Excel")).toBeInTheDocument();
    unmount();
    renderWithStore(<OpeningImportButton />, { me: meFixture("PM") });
    expect(screen.queryByRole("button", { name: "Import from Excel" })).not.toBeInTheDocument();
  });
});
