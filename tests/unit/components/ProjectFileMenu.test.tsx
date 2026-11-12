import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../render";

const exportFile = vi.fn();
vi.mock("@/api/services/reports.api", () => ({
  useExportProjectFileMutation: () => [exportFile, { isLoading: false }],
}));

const { ProjectFileMenu } = await import("@/features/reports/components/ProjectFileMenu");

describe("ProjectFileMenu", () => {
  it("asks for the whole project as a PDF in the reader's language and opens the link", { timeout: 20_000 }, async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("CORS"));
    exportFile.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://files/pf.pdf", downloadUrl: "https://files/pf.pdf?dl=1", fileName: "project-file-MSB-2026-012-2026-11-12.pdf" }) });
    const user = userEvent.setup();
    renderWithStore(<ProjectFileMenu projectId="p1" />);
    await user.click(screen.getByRole("button", { name: /Project file/ }));
    await user.click(await screen.findByRole("menuitem", { name: "PDF" }));
    expect(exportFile).toHaveBeenCalledWith({ projectId: "p1", format: "pdf", lang: "en" });
    await vi.waitFor(() => expect(open).toHaveBeenCalledWith("https://files/pf.pdf?dl=1", "_blank", "noopener,noreferrer"));
    open.mockRestore();
    fetchSpy.mockRestore();
  });
});
