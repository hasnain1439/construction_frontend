import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "@/components/common/DataTable";
import { renderWithStore } from "../render";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = Array.from({ length: 23 }, (_, i) => ({
  id: `r${i + 1}`,
  name: `Supplier ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
  amount: (i * 37) % 100,
}));

const columns: Column<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
  { id: "amount", header: "Amount", cell: (r) => r.amount, sortValue: (r) => r.amount, align: "right" },
];

const bodyCells = (column: number) =>
  screen.getAllByTestId("data-row").map((row) => within(row).getAllByRole("cell")[column].textContent);

describe("DataTable", () => {
  it("sorts ascending, then descending, then back to the original order", async () => {
    const user = userEvent.setup();
    renderWithStore(
      <DataTable rows={rows.slice(0, 5)} columns={columns} getRowId={(r) => r.id} empty={{ title: "None" }} />,
    );
    const original = bodyCells(1);
    const amountHeader = screen.getByRole("columnheader", { name: /amount/i });
    expect(amountHeader).toHaveAttribute("aria-sort", "none");

    await user.click(within(amountHeader).getByRole("button"));
    expect(amountHeader).toHaveAttribute("aria-sort", "ascending");
    const asc = bodyCells(1).map(Number);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));

    await user.click(within(amountHeader).getByRole("button"));
    expect(amountHeader).toHaveAttribute("aria-sort", "descending");
    const desc = bodyCells(1).map(Number);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));

    await user.click(within(amountHeader).getByRole("button"));
    expect(bodyCells(1)).toEqual(original);
  });

  it("paginates on the client and moves between pages", async () => {
    const user = userEvent.setup();
    renderWithStore(
      <DataTable rows={rows} columns={columns} getRowId={(r) => r.id} empty={{ title: "None" }} clientPageSize={10} />,
    );
    expect(screen.getAllByTestId("data-row")).toHaveLength(10);
    expect(screen.getByText(/showing 1–10 of 23/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/showing 11–20 of 23/i)).toBeInTheDocument();
    expect(bodyCells(0)[0]).toBe(rows[10].name);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getAllByTestId("data-row")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("uses server pagination when given", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithStore(
      <DataTable
        rows={rows.slice(0, 25)}
        columns={columns}
        getRowId={(r) => r.id}
        empty={{ title: "None" }}
        pagination={{ page: 1, pageSize: 25, total: 73, onPageChange }}
      />,
    );
    expect(screen.getByText(/showing 1–25 of 73/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("shows the empty state when there are no rows", () => {
    renderWithStore(
      <DataTable
        rows={[]}
        columns={columns}
        getRowId={(r) => r.id}
        empty={{ title: "No suppliers yet", description: "Add your first supplier." }}
      />,
    );
    expect(screen.getByText("No suppliers yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first supplier.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a skeleton while loading and an error with retry", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithStore(
      <DataTable rows={undefined} loading columns={columns} getRowId={(r) => r.id} empty={{ title: "None" }} />,
    );
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();

    const onRetry = vi.fn();
    rerender(
      <DataTable
        rows={undefined}
        error={{ status: 0, code: "NETWORK_ERROR", message: "x" }}
        onRetry={onRetry}
        columns={columns}
        getRowId={(r) => r.id}
        empty={{ title: "None" }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/can't reach the server/i);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("opens a row with click or keyboard", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderWithStore(
      <DataTable rows={rows.slice(0, 2)} columns={columns} getRowId={(r) => r.id} empty={{ title: "None" }} onRowClick={onRowClick} />,
    );
    const [first] = screen.getAllByTestId("data-row");
    await user.click(first);
    first.focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});

describe("DataTable — wide table scrolling sideways", () => {
  /** jsdom has no layout: pretend the table is 1,200 px wide in a 600 px card. */
  function wideLayout() {
    const width = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1200);
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
    return () => {
      width.mockRestore();
      client.mockRestore();
    };
  }
  const withActions: Column<Row>[] = [...columns, { id: "actions", header: "", cell: () => <button type="button">Actions</button> }];

  it("keeps the actions column at the end edge (no scrolling to reach the button)", () => {
    const restore = wideLayout();
    try {
      const { container } = renderWithStore(<DataTable rows={rows.slice(0, 3)} columns={withActions} getRowId={(r) => r.id} empty={{ title: "None" }} />);
      expect(container.querySelector("[data-sticky-actions]")).not.toBeNull();
      // The sticky column casts its own shadow; the edge fade would sit on top of the button
      expect(screen.queryByTestId("scroll-shadow-end")).toBeNull();
    } finally {
      restore();
    }
  });

  it("without an actions column the end fade still hints at hidden columns", () => {
    const restore = wideLayout();
    try {
      const { container } = renderWithStore(<DataTable rows={rows.slice(0, 3)} columns={columns} getRowId={(r) => r.id} empty={{ title: "None" }} />);
      expect(container.querySelector("[data-sticky-actions]")).toBeNull();
      expect(screen.getByTestId("scroll-shadow-end")).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});
