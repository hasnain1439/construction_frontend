import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { renderWithStore } from "../render";

function Harness({ initial, onChange }: { initial: string | null; onChange: (v: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <MoneyInput
      aria-label="Contract value"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("MoneyInput", () => {
  it("edits rupees and emits paisa strings", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithStore(<Harness initial={null} onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Contract value" });

    await user.type(input, "18500000");
    expect(onChange).toHaveBeenLastCalledWith("1850000000");

    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(null);

    await user.type(input, "1450.5");
    expect(onChange).toHaveBeenLastCalledWith("145050");
  });

  it("shows an existing paisa value as grouped rupees and ungrouped while editing", async () => {
    const user = userEvent.setup();
    renderWithStore(<Harness initial="1850000000" onChange={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Contract value" });
    expect(input).toHaveValue("1,85,00,000");
    await user.click(input);
    expect(input).toHaveValue("18500000");
    await user.tab();
    expect(input).toHaveValue("1,85,00,000");
  });

  it("ignores letters and a third decimal", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithStore(<Harness initial={null} onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Contract value" });
    await user.type(input, "12a.345");
    expect(input).toHaveValue("12.34");
    expect(onChange).toHaveBeenLastCalledWith("1234");
  });
});
