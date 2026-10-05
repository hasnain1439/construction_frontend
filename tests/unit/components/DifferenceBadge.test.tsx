import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DifferenceBadge, differenceResult } from "@/components/common/DifferenceBadge";
import { StockStatusBadge, stockStatus } from "@/components/common/StockStatusBadge";

describe("DifferenceBadge", () => {
  it.each([
    [200, 200, 0, "COMPLETE"],
    [200, 190, 0, "SHORT"],
    [5000, 5000, 200, "DAMAGED"],
    [200, 190, 5, "SHORT_AND_DAMAGED"],
    [100, 102, 0, "EXCESS"],
  ] as const)("sent %i, counted %i, damaged %i → %s", (expected, counted, damaged, result) => {
    expect(differenceResult(expected, counted, damaged)).toBe(result);
  });

  it("shows the state with the signed difference and unit, colour + icon + label", () => {
    const { container, rerender } = render(<DifferenceBadge expected={200} counted={190} unit="bag" />);
    expect(screen.getByText("Short · -10 bags")).toBeInTheDocument();
    expect(container.querySelector("[data-tone]")).toHaveAttribute("data-tone", "warning");

    rerender(<DifferenceBadge expected={5000} counted={5000} damaged={200} unit="nos" />);
    expect(screen.getByText("Damaged · -200 nos")).toBeInTheDocument();
    expect(container.querySelector("[data-tone]")).toHaveAttribute("data-tone", "danger");

    rerender(<DifferenceBadge result="EXCESS" difference={2} unit="bag" />);
    expect(screen.getByText("Excess · +2 bags")).toBeInTheDocument();

    rerender(<DifferenceBadge expected={80} counted={80} />);
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(container.querySelector("[data-tone]")).toHaveAttribute("data-tone", "success");
  });
});

describe("StockStatusBadge", () => {
  it("low below the level, out at zero, otherwise in stock", () => {
    expect(stockStatus(150, 200)).toBe("LOW");
    expect(stockStatus(0, 200)).toBe("OUT");
    expect(stockStatus(220, 200)).toBe("OK");
    expect(stockStatus(5, null)).toBe("OK");
    render(<StockStatusBadge qty={150} minQty={200} />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });
});
