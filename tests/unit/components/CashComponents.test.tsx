import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { BalanceCard } from "@/components/common/BalanceCard";
import { categoryLabel, CategoryChips, type KharchaCategory } from "@/components/common/CategoryChips";
import { StatusTimeline } from "@/components/common/StatusTimeline";
import { StepperInput } from "@/components/forms/StepperInput";

describe("BalanceCard", () => {
  it("shows the balance and what is waiting", () => {
    render(
      <BalanceCard
        account={{ holder: { name: "Rafaqat Ali" }, balancePaisa: "930000", pendingAckPaisa: "4000000", pendingApprovalPaisa: "2800000", recoverablePaisa: "0", lastCountAt: null }}
      />,
    );
    expect(screen.getByTestId("cash-balance")).toHaveTextContent("Rs 9,300");
    expect(screen.getByText(/float to acknowledge/)).toHaveTextContent("Rs 40,000");
    expect(screen.getByText(/waiting for approval/)).toHaveTextContent("Rs 28,000");
    expect(screen.queryByText(/to pay back/)).not.toBeInTheDocument();
    expect(screen.getByText("Last count: never")).toBeInTheDocument();
  });

  it("a negative balance is shown in red", () => {
    render(<BalanceCard account={{ holder: { name: "Asif" }, balancePaisa: "-50000", recoverablePaisa: "50000" }} />);
    expect(screen.getByTestId("cash-balance").className).toContain("text-danger");
    expect(screen.getByText(/to pay back/)).toBeInTheDocument();
  });
});

describe("CategoryChips", () => {
  function Harness() {
    const [value, setValue] = useState<KharchaCategory | undefined>("FUEL");
    return (
      <>
        <CategoryChips allowAll value={value} onChange={setValue} />
        <output data-testid="v">{value ?? "ALL"}</output>
      </>
    );
  }

  it("works as a radio group with an All chip", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "Fuel" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Urgent material" }));
    expect(screen.getByTestId("v")).toHaveTextContent("URGENT_MATERIAL");
    await user.click(screen.getByRole("radio", { name: "All" }));
    expect(screen.getByTestId("v")).toHaveTextContent("ALL");
    expect(categoryLabel("OWNER_PURCHASE")).toBe("For the owner");
    expect(categoryLabel(null)).toBe("—");
  });
});

describe("StepperInput", () => {
  function Harness() {
    const [value, setValue] = useState(0);
    return <StepperInput value={value} onChange={setValue} step={0.5} max={1} aria-label="overtime" />;
  }

  it("steps within min / max with buttons and arrow keys", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const spin = screen.getByRole("spinbutton", { name: "overtime" });
    expect(screen.getByRole("button", { name: "Less overtime" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "More overtime" }));
    expect(spin).toHaveAttribute("aria-valuenow", "0.5");
    spin.focus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(spin).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("button", { name: "More overtime" })).toBeDisabled();
    await user.keyboard("{ArrowDown}");
    expect(spin).toHaveAttribute("aria-valuenow", "0.5");
  });
});

describe("StatusTimeline", () => {
  it("lists the steps with who / when and the return comment", () => {
    render(
      <StatusTimeline
        steps={[
          { label: "Generated", state: "done", by: "Rafaqat Ali", at: "2026-09-26T12:00:00.000Z" },
          { label: "Returned", state: "returned", note: "Akram was on leave" },
          { label: "Approved", state: "pending" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Rafaqat Ali");
    expect(items[1]).toHaveTextContent("“Akram was on leave”");
  });
});
