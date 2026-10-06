import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { WeekPicker } from "@/components/common/WeekPicker";
import { addDays, currentWeekStart, formatWeekRange, weekStartOf } from "@/lib/weeks";

function Harness({ initial }: { initial: string }) {
  const [week, setWeek] = useState(initial);
  return (
    <>
      <WeekPicker value={week} onChange={setWeek} />
      <output data-testid="week">{week}</output>
    </>
  );
}

describe("WeekPicker", () => {
  it("moves a week at a time and never past this week", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    const thisWeek = currentWeekStart();
    render(<Harness initial={addDays(thisWeek, -14)} />);
    expect(screen.getByRole("button", { name: "This week" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByTestId("week")).toHaveTextContent(addDays(thisWeek, -7));
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByTestId("week")).toHaveTextContent(addDays(thisWeek, -14));
    await user.click(screen.getByRole("button", { name: "This week" }));
    expect(screen.getByTestId("week")).toHaveTextContent(thisWeek);
    expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "This week" })).not.toBeInTheDocument();
  });

  it("week maths and labels", () => {
    expect(weekStartOf("2026-09-23")).toBe("2026-09-21"); // Wednesday → Monday
    expect(weekStartOf("2026-09-21")).toBe("2026-09-21");
    expect(weekStartOf("2026-09-27")).toBe("2026-09-21"); // Sunday belongs to the week before
    expect(weekStartOf("2026-09-23", "SATURDAY")).toBe("2026-09-19");
    expect(formatWeekRange("2026-09-21")).toMatch(/^21 – 27 Sep.* 2026$/);
    expect(formatWeekRange("2026-09-28")).toMatch(/^28 Sep.* – 4 Oct.* 2026$/);
  });
});
