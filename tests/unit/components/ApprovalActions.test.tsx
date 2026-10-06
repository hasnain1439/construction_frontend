import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApprovalActions } from "@/components/common/ApprovalActions";

describe("ApprovalActions", () => {
  it("approves straight away", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<ApprovalActions onApprove={onApprove} onDecline={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it("returning needs a comment of at least 3 characters", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn().mockResolvedValue(undefined);
    render(<ApprovalActions onApprove={vi.fn()} onDecline={onDecline} />);
    await user.click(screen.getByRole("button", { name: "Return" }));
    const dialog = screen.getByRole("dialog");
    const confirm = screen.getAllByRole("button", { name: "Return" }).at(-1)!;
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Comment"), "ok");
    expect(screen.getByText("Write at least 3 characters.")).toBeInTheDocument();
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Comment"), " — Akram was on leave Wednesday");
    await user.click(confirm);
    expect(onDecline).toHaveBeenCalledWith("ok — Akram was on leave Wednesday");
    expect(dialog).not.toBeInTheDocument();
  });

  it("reject variant keeps the dialog open when the call fails", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn().mockRejectedValue(new Error("nope"));
    render(<ApprovalActions decline="reject" onApprove={vi.fn()} onDecline={onDecline} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByLabelText("Comment"), "No bill attached");
    await user.click(screen.getAllByRole("button", { name: "Reject" }).at(-1)!);
    expect(onDecline).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
