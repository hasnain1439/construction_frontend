import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { percentTotal } from "@/components/common/PercentTotalChip";
import { Form } from "@/components/forms/Form";
import { suggestCode } from "@/features/master-data/components/CategoryDialogs";
import { StageEditor, type StageRow } from "@/features/master-data/components/StageEditor";
import { renderWithStore } from "../render";

function Harness({ stages, totalPaisa }: { stages: StageRow[]; totalPaisa?: string }) {
  const form = useForm<{ stages: StageRow[] }>({ defaultValues: { stages } });
  return (
    <Form form={form} onSubmit={() => {}}>
      <StageEditor name="stages" totalPaisa={totalPaisa} />
    </Form>
  );
}

describe("StageEditor (payment schedule)", () => {
  it("shows a live 100 % chip and updates as percentages change", async () => {
    const user = userEvent.setup();
    renderWithStore(
      <Harness
        stages={[
          { label: "Advance", percent: 20, isRetention: false },
          { label: "Grey", percent: 75, isRetention: false },
          { label: "Retention", percent: 5, isRetention: true },
        ]}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("100% ✓");

    const grey = screen.getByRole("textbox", { name: "Stage 2 percent" });
    await user.clear(grey);
    await user.type(grey, "70");
    expect(screen.getByRole("status")).toHaveTextContent("95% — must be 100%");
  });

  it("adds and removes stages, with one retention stage at most", async () => {
    const user = userEvent.setup();
    renderWithStore(<Harness stages={[{ label: "All", percent: 95, isRetention: false }, { label: "Retention", percent: 5, isRetention: true }]} />);
    await user.click(screen.getByRole("button", { name: /add stage/i }));
    expect(screen.getByRole("textbox", { name: "Stage 3 name" })).toBeInTheDocument();
    // Only the existing retention stage can stay ticked.
    expect(screen.getByRole("checkbox", { name: "Stage 3 is retention" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove stage 3" }));
    expect(screen.queryByRole("textbox", { name: "Stage 3 name" })).not.toBeInTheDocument();
  });

  it("shows each stage amount rounded to the rupee when a contract total is given", () => {
    renderWithStore(<Harness stages={[{ label: "Advance", percent: 15, isRetention: false }, { label: "Rest", percent: 85, isRetention: false }]} totalPaisa="1850000000" />);
    expect(screen.getByText("Rs 27,75,000")).toBeInTheDocument();
    expect(screen.getByText("Rs 1,57,25,000")).toBeInTheDocument();
  });
});

describe("helpers", () => {
  it("adds percentages without float noise", () => {
    expect(percentTotal([33.33, 33.33, 33.34])).toBe(100);
    expect(percentTotal([10.1, 20.2, null, 69.7])).toBe(100);
  });

  it("suggests a quality-category code from its name", () => {
    expect(suggestCode("A Luxury")).toBe("A_LUXURY");
    expect(suggestCode("A+ Premium")).toBe("A_PLUS_PRE");
    expect(suggestCode("2025 range")).toBe("C2025_RANG");
  });
});
