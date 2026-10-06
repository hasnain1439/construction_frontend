import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AttendanceGrid, daysWorked, nextStatus, type AttendanceGridRow, type HazriMark } from "@/components/common/AttendanceGrid";

const DATES = ["2026-09-21", "2026-09-22", "2026-09-23"];

function Harness({ locked = [] as string[], overtimeMode = false }) {
  const [rows, setRows] = useState<AttendanceGridRow[]>([
    { id: "akram", name: "Ustad Akram", subtitle: "Mistri", days: { "2026-09-21": { status: "FULL", overtimeHours: 0 } } },
    { id: "riaz", name: "Riaz", days: {} },
  ]);
  const onChange = (workerId: string, date: string, mark: HazriMark) =>
    setRows((rs) => rs.map((r) => (r.id === workerId ? { ...r, days: { ...r.days, [date]: mark } } : r)));
  return <AttendanceGrid dates={DATES} rows={rows} onChange={onChange} canEdit={(d) => !locked.includes(d)} overtimeMode={overtimeMode} today="2026-09-23" />;
}

const cell = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("AttendanceGrid", () => {
  it("cycles full → half → absent → full on click and keeps the day totals", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const riazTue = cell("Riaz, Tue 22");
    expect(riazTue).toHaveAccessibleName("Riaz, Tue 22: Not marked");
    await user.click(riazTue);
    expect(cell("Riaz, Tue 22")).toHaveAccessibleName("Riaz, Tue 22: Full day");
    await user.click(cell("Riaz, Tue 22"));
    expect(cell("Riaz, Tue 22")).toHaveAccessibleName("Riaz, Tue 22: Half day");
    expect(screen.getByTestId("days-riaz")).toHaveTextContent("0.5");
    await user.click(cell("Riaz, Tue 22"));
    expect(cell("Riaz, Tue 22")).toHaveAccessibleName("Riaz, Tue 22: Absent");
    await user.click(cell("Riaz, Tue 22"));
    expect(cell("Riaz, Tue 22")).toHaveAccessibleName("Riaz, Tue 22: Full day");
    expect(screen.getByTestId("days-akram")).toHaveTextContent("1");
    const foot = screen.getAllByRole("rowgroup").at(-1)!;
    expect(within(foot).getByText("On site")).toBeInTheDocument();
  });

  it("keyboard: arrows move, F / H / A set the mark; locked days don't change", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    render(<Harness locked={["2026-09-21"]} />);
    cell("Ustad Akram, Tue 22").focus();
    await user.keyboard("h");
    expect(cell("Ustad Akram, Tue 22")).toHaveAccessibleName(/Half day/);
    await user.keyboard("{ArrowDown}");
    expect(cell("Riaz, Tue 22")).toHaveFocus();
    await user.keyboard("a");
    expect(cell("Riaz, Tue 22")).toHaveAccessibleName(/Absent/);
    await user.keyboard("{ArrowRight}f");
    expect(cell("Riaz, Wed 23")).toHaveAccessibleName(/Full day/);
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(cell("Riaz, Mon 21")).toHaveFocus();
    await user.keyboard("f");
    expect(cell("Riaz, Mon 21")).toHaveAccessibleName(/Not marked/); // locked
    await user.click(cell("Ustad Akram, Mon 21"));
    expect(cell("Ustad Akram, Mon 21")).toHaveAccessibleName(/Full day/);
  });

  it("overtime mode adds a stepper on marked days", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    render(<Harness overtimeMode />);
    await user.click(screen.getByRole("button", { name: "More overtime Ustad Akram Mon 21" }));
    await user.click(screen.getByRole("button", { name: "More overtime Ustad Akram Mon 21" }));
    expect(screen.getByRole("spinbutton", { name: "overtime Ustad Akram Mon 21" })).toHaveAttribute("aria-valuenow", "1");
  });

  it("helpers", () => {
    expect([nextStatus(undefined), nextStatus("FULL"), nextStatus("HALF"), nextStatus("ABSENT")]).toEqual(["FULL", "HALF", "ABSENT", "FULL"]);
    expect(daysWorked({ a: { status: "FULL", overtimeHours: 0 }, b: { status: "HALF", overtimeHours: 0 }, c: { status: "ABSENT", overtimeHours: 0 } })).toBe(1.5);
  });
});
