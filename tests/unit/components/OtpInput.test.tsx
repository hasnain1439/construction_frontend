import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "@/components/forms/OtpInput";
import { renderWithStore } from "../render";

function Harness({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <OtpInput
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("OtpInput", () => {
  it("advances focus while typing and reports the code", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithStore(<Harness onChange={onChange} />);
    await user.click(screen.getByLabelText("Digit 1"));
    await user.keyboard("482913");
    expect(onChange).toHaveBeenLastCalledWith("482913");
    expect(screen.getByLabelText("Digit 6")).toHaveValue("3");
  });

  it("fills every box on paste", () => {
    const onChange = vi.fn();
    renderWithStore(<Harness onChange={onChange} />);
    fireEvent.paste(screen.getByLabelText("Digit 1"), { clipboardData: { getData: () => "12 34 56" } });
    expect(onChange).toHaveBeenLastCalledWith("123456");
  });

  it("ignores letters", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithStore(<Harness onChange={onChange} />);
    await user.type(screen.getByLabelText("Digit 1"), "a");
    expect(screen.getByLabelText("Digit 1")).toHaveValue("");
  });
});
