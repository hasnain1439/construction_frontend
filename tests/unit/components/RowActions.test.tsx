import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pencil } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { RowActions } from "@/components/common/RowActions";
import { renderWithStore } from "../render";

describe("RowActions", () => {
  it("lists the visible actions and runs the chosen one", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onSecret = vi.fn();
    renderWithStore(
      <RowActions
        name="Ali Town"
        actions={[
          { label: "Edit", icon: Pencil, onSelect: onEdit },
          { label: "Secret", hidden: true, onSelect: onSecret },
          { label: "Deactivate", destructive: true, onSelect: vi.fn() },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Ali Town" }));
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Deactivate" })).toHaveAttribute("data-variant", "destructive");
    expect(screen.queryByRole("menuitem", { name: "Secret" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onSecret).not.toHaveBeenCalled();
  });

  it("renders nothing when no action is visible", () => {
    const { container } = renderWithStore(<RowActions actions={[{ label: "Edit", hidden: true, onSelect: vi.fn() }]} />);
    expect(container).toBeEmptyDOMElement();
    renderWithStore(<RowActions actions={[]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not run disabled actions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithStore(<RowActions actions={[{ label: "Resend", disabled: true, onSelect }]} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Resend" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps clicks away from the row", async () => {
    const user = userEvent.setup();
    const onRow = vi.fn();
    const onSelect = vi.fn();
    renderWithStore(
      <div onClick={onRow}>
        <RowActions actions={[{ label: "Edit", onSelect }]} />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
  });

  it("asks first for actions with a confirm step", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderWithStore(
      <RowActions
        name="Ali Town"
        actions={[{ label: "Deactivate", destructive: true, confirm: { title: "Deactivate Ali Town?", confirmLabel: "Deactivate", onConfirm } }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Ali Town" }));
    await user.click(screen.getByRole("menuitem", { name: "Deactivate" }));
    expect(await screen.findByText("Deactivate Ali Town?")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText("Deactivate Ali Town?")).not.toBeInTheDocument());
  });

  it("labels the trigger in Urdu", () => {
    renderWithStore(<RowActions name="علی ٹاؤن" actions={[{ label: "ترمیم", onSelect: vi.fn() }]} />, { ui: { language: "ur" } });
    expect(screen.getByRole("button", { name: "علی ٹاؤن کی کارروائیاں" })).toBeInTheDocument();
  });
});
