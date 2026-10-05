import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { LineItemsEditor, type LineRow } from "@/components/common/LineItemsEditor";
import { Form } from "@/components/forms/Form";
import { renderWithStore } from "../render";

const cement = { id: "m-cement", name: "Cement OPC", unit: "bag" };
const bricks = { id: "m-bricks", name: "Clay bricks Class-1", unit: "nos" };

function Harness({ rows, fixed }: { rows: LineRow[]; fixed?: boolean }) {
  const form = useForm<{ items: LineRow[] }>({ defaultValues: { items: rows } });
  return (
    <Form form={form} onSubmit={() => {}}>
      <LineItemsEditor
        name="items"
        materialMode={fixed ? "fixed" : "pick"}
        columns={[
          { key: "qty", label: "Qty", kind: "quantity", required: true },
          { key: "ratePaisa", label: "Rate", kind: "money" },
        ]}
        amount={{ qtyKey: "qty", rateKey: "ratePaisa" }}
        emptyRow={() => ({ materialId: null, qty: null, ratePaisa: null })}
      />
    </Form>
  );
}

describe("LineItemsEditor", () => {
  it("shows each line amount (qty × rate, exact paisa) and the total", () => {
    renderWithStore(
      <Harness
        rows={[
          { materialId: cement.id, material: cement, qty: "400", ratePaisa: "143000" },
          { materialId: bricks.id, material: bricks, qty: "5000", ratePaisa: "1700" },
        ]}
      />,
    );
    const amounts = screen.getAllByTestId("line-amount").map((c) => c.textContent);
    expect(amounts).toEqual(["Rs 5,72,000", "Rs 85,000"]);
    expect(screen.getByTestId("lines-total")).toHaveTextContent("Rs 6,57,000");
    expect(screen.getByText("2 materials")).toBeInTheDocument();
  });

  it("adds a row, updates the total as you type, and removes rows (never the last one)", async () => {
    const user = userEvent.setup();
    renderWithStore(<Harness rows={[{ materialId: cement.id, material: cement, qty: "10", ratePaisa: "143000" }]} />);
    expect(screen.getByRole("button", { name: "Remove Cement OPC" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /add material/i }));
    expect(screen.getAllByTestId("line-row")).toHaveLength(2);
    const second = screen.getAllByTestId("line-row")[1]!;
    await user.type(within(second).getByRole("textbox", { name: "Line 2 Qty" }), "2.5");
    await user.type(within(second).getByRole("textbox", { name: "Line 2 Rate" }), "100");
    expect(screen.getByTestId("lines-total")).toHaveTextContent("Rs 14,550"); // 14,300 + 250

    await user.click(screen.getByRole("button", { name: "Remove Line 2" }));
    expect(screen.getAllByTestId("line-row")).toHaveLength(1);
    expect(screen.getByTestId("lines-total")).toHaveTextContent("Rs 14,300");
  });

  it("fixed rows (receive / count) have no picker, add or remove", () => {
    renderWithStore(<Harness fixed rows={[{ materialId: cement.id, material: cement, qty: null, ratePaisa: null }]} />);
    expect(screen.getByText("Cement OPC")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add material/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Cement OPC Qty" })).toBeInTheDocument();
  });
});
