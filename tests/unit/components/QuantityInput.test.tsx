import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { QuantityInput } from "@/components/forms/QuantityInput";

function Harness({ initial = null, onValue }: { initial?: string | null; onValue?: (v: string | null) => void }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <QuantityInput
        aria-label="Quantity"
        unit="bags"
        value={value}
        onChange={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
      <output data-testid="value">{value ?? "null"}</output>
    </>
  );
}

describe("QuantityInput", () => {
  it("keeps at most 3 decimals and emits a normalised decimal string", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    await user.type(input, "12.3456");
    expect(input).toHaveValue("12.345");
    expect(screen.getByTestId("value")).toHaveTextContent("12.345");

    await user.clear(input);
    await user.type(input, "0012.50");
    expect(screen.getByTestId("value")).toHaveTextContent("12.5");
  });

  it("ignores letters and shows lakh grouping with the unit when not focused", async () => {
    const user = userEvent.setup();
    render(<Harness initial="17000" />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    expect(input).toHaveValue("17,000");
    expect(screen.getByText("bags")).toBeInTheDocument();
    await user.click(input);
    expect(input).toHaveValue("17000");
    await user.type(input, "x");
    expect(input).toHaveValue("17000");
    await user.clear(input);
    expect(screen.getByTestId("value")).toHaveTextContent("null");
  });
});
