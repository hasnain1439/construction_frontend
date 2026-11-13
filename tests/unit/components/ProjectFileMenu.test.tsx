import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../render";

const exportFile = vi.fn();
vi.mock("@/api/services/reports.api", () => ({
  useExportProjectFileMutation: () => [exportFile, { isLoading: false }],
  useGetProjectFilePartsQuery: () => ({ data: ["setup", "estimate", "billing", "daily"], isLoading: false }),
}));

const { ProjectFileMenu } = await import("@/features/reports/components/ProjectFileMenu");

beforeEach(() => exportFile.mockReset());

describe("ProjectFileMenu", () => {
  it("PDF: a box per part the reader may see; only the ticked parts go into the file", { timeout: 20_000 }, async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("CORS"));
    exportFile.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://files/pf.pdf", downloadUrl: "https://files/pf.pdf?dl=1", fileName: "project-file-MSB-2026-012-2026-11-13.pdf" }) });
    const user = userEvent.setup();
    renderWithStore(<ProjectFileMenu projectId="p1" />);
    await user.click(screen.getByRole("button", { name: /Project file/ }));
    await user.click(await screen.findByRole("menuitem", { name: "PDF" }));
    expect(await screen.findByText("What goes in the file?")).toBeInTheDocument();
    // 3D pictures (PDF only) + the parts the API offers; nothing else
    for (const label of ["3D pictures", "Project setup", "Estimate", "Bills & payments", "Daily work"]) expect(screen.getByLabelText(new RegExp(label))).toBeChecked();
    expect(screen.queryByLabelText(/Cash & cost/)).toBeNull();
    await user.click(screen.getByLabelText(/3D pictures/));
    await user.click(screen.getByLabelText(/Bills & payments/));
    await user.click(screen.getByRole("button", { name: /Make the file/ }));
    expect(exportFile).toHaveBeenCalledWith({ projectId: "p1", format: "pdf", lang: "en", parts: ["setup", "estimate", "daily"] });
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith("https://files/pf.pdf?dl=1", "_blank", "noopener,noreferrer"));
    open.mockRestore();
    fetchSpy.mockRestore();
  });

  it("Excel has no 3D pictures box; None leaves the button off", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    renderWithStore(<ProjectFileMenu projectId="p1" />);
    await user.click(screen.getByRole("button", { name: /Project file/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Excel" }));
    expect(await screen.findByLabelText(/Project setup/)).toBeChecked();
    expect(screen.queryByLabelText(/3D pictures/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "None" }));
    expect(screen.getByRole("button", { name: /Make the file/ })).toBeDisabled();
  });
});
