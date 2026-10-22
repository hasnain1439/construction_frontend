import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StepTabs, stepPosition, type Step } from "@/components/common/StepTabs";
import { FieldGrid } from "@/components/forms/Form";
import { scrollEdges } from "@/hooks/useScrollEdges";
import { renderWithStore } from "../render";

const STEPS: Step[] = [
  { id: 1, label: "Basic" },
  { id: 2, label: "Contract" },
  { id: 3, label: "Plot" },
  { id: 4, label: "Coverage" },
  { id: 5, label: "Rooms" },
  { id: 6, label: "Estimate" },
  { id: 7, label: "Review" },
];

describe("stepPosition (QA R-01)", () => {
  it("gives the number, total, label and neighbours", () => {
    expect(stepPosition(STEPS, 6)).toEqual({ number: 6, total: 7, label: "Estimate", prev: 5, next: 7 });
  });

  it("has no neighbour past either end", () => {
    expect(stepPosition(STEPS, 1)).toMatchObject({ prev: null, next: 2 });
    expect(stepPosition(STEPS, 7)).toMatchObject({ prev: 6, next: null });
  });

  it("skips disabled steps and uses the shown number of a renumbered step", () => {
    const steps: Step[] = [
      { id: 1, label: "Basic" },
      { id: 2, label: "Contract", disabled: true },
      { id: 5, number: 3, label: "Rooms" },
      { id: 7, number: 4, label: "Review", disabled: true },
    ];
    expect(stepPosition(steps, 5)).toEqual({ number: 3, total: 4, label: "Rooms", prev: 1, next: null });
  });

  it("is empty for an unknown step", () => {
    expect(stepPosition(STEPS, 42)).toEqual({ number: 0, total: 7, label: "", prev: null, next: null });
  });
});

describe("StepTabs compact header and auto-scroll (QA R-01)", () => {
  const scrollIntoView = vi.fn();
  const original = HTMLElement.prototype.scrollIntoView;
  afterEach(() => {
    scrollIntoView.mockReset();
    HTMLElement.prototype.scrollIntoView = original;
  });

  it("shows 'Step n of total · label' and moves with the arrows", async () => {
    const onSelect = vi.fn();
    renderWithStore(<StepTabs steps={STEPS} current={6} onSelect={onSelect} />);
    expect(screen.getByTestId("step-compact")).toHaveTextContent("Step 6 of 7 · Estimate");
    await userEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(onSelect).toHaveBeenLastCalledWith(5);
    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(onSelect).toHaveBeenLastCalledWith(7);
  });

  it("disables the arrow at either end", () => {
    renderWithStore(<StepTabs steps={STEPS} current={7} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "Next step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous step" })).toBeEnabled();
  });

  it("scrolls the active step into view on mount (instantly) and on change (smoothly)", () => {
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const { rerender } = renderWithStore(<StepTabs steps={STEPS} current={6} onSelect={() => {}} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("tab", { name: /Estimate/ }));
    expect(scrollIntoView).toHaveBeenLastCalledWith({ inline: "center", block: "nearest", behavior: "auto" });
    rerender(<StepTabs steps={STEPS} current={7} onSelect={() => {}} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView.mock.contexts[1]).toBe(screen.getByRole("tab", { name: /Review/ }));
    expect(scrollIntoView).toHaveBeenLastCalledWith({ inline: "center", block: "nearest", behavior: "smooth" });
  });

  it("does not animate the scroll when the user prefers reduced motion", () => {
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
    );
    const { rerender } = renderWithStore(<StepTabs steps={STEPS} current={2} onSelect={() => {}} />);
    rerender(<StepTabs steps={STEPS} current={3} onSelect={() => {}} />);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ inline: "center", block: "nearest", behavior: "auto" });
    matchMedia.mockRestore();
  });
});

describe("scrollEdges (QA R-02 scroll hint)", () => {
  it("reports no overflow when the content fits", () => {
    expect(scrollEdges(0, 400, 400)).toEqual({ overflow: false, start: false, end: false });
    expect(scrollEdges(0, 401, 400)).toEqual({ overflow: false, start: false, end: false });
  });

  it("shows the end hint at the start, both in the middle and the start hint at the end", () => {
    expect(scrollEdges(0, 900, 400)).toEqual({ overflow: true, start: false, end: true });
    expect(scrollEdges(200, 900, 400)).toEqual({ overflow: true, start: true, end: true });
    expect(scrollEdges(500, 900, 400)).toEqual({ overflow: true, start: true, end: false });
  });

  it("reads a right-to-left (negative) scroll position by its size", () => {
    expect(scrollEdges(-500, 900, 400)).toEqual({ overflow: true, start: true, end: false });
  });
});

interface Row {
  id: string;
  name: string;
  plan: string;
}

describe("DataTable cards view (QA R-02)", () => {
  const columns: Column<Row>[] = [
    { id: "name", header: "Company", cell: (r) => r.name },
    { id: "plan", header: "Plan", cell: (r) => r.plan },
    { id: "hidden", header: "Hidden", cell: () => "x", hidden: true },
  ];
  const rows: Row[] = [
    { id: "a", name: "Malik & Sons", plan: "Pro" },
    { id: "b", name: "Ali Builders", plan: "Starter" },
  ];

  it("lists each row as a card: the first column as the title, the others as label / value", async () => {
    const onRowClick = vi.fn();
    renderWithStore(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} empty={{ title: "None" }} view="cards" onRowClick={onRowClick} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const cards = screen.getAllByTestId("data-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Malik & Sons");
    expect(cards[0]).toHaveTextContent("PlanPro");
    expect(cards[0]).not.toHaveTextContent("Hidden");
    await userEvent.click(cards[1]);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("keeps the table by default", () => {
    renderWithStore(<DataTable rows={rows} columns={columns} getRowId={(r) => r.id} empty={{ title: "None" }} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByTestId("data-card")).not.toBeInTheDocument();
  });

  it("shows the empty state in cards view too", () => {
    renderWithStore(<DataTable rows={[]} columns={columns} getRowId={(r) => r.id} empty={{ title: "No companies" }} view="cards" />);
    expect(screen.getByText("No companies")).toBeInTheDocument();
  });
});

describe("FieldGrid fit (QA R-06)", () => {
  it("sizes its columns by its container: 1, then 2 from 420 px, then 3 from 640 px", () => {
    const { container } = renderWithStore(
      <FieldGrid columns={3} fit>
        <span>a</span>
      </FieldGrid>,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer).toHaveClass("@container");
    expect(outer.firstElementChild).toHaveClass("grid", "@[420px]:grid-cols-2", "@[640px]:grid-cols-3");
    expect(outer.firstElementChild?.className).not.toMatch(/(^|\s)(sm|lg):grid-cols/);
  });
});
