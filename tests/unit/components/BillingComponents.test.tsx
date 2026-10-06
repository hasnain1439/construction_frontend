import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AllocationEditor, allocationSummary, autoAllocate, type AllocatableInvoice } from "@/components/common/AllocationEditor";
import { InvoiceStatusBadge } from "@/components/common/BillingBadges";
import { whatsappUrl } from "@/components/common/PdfActions";
import { StageTimeline } from "@/components/common/StageTimeline";
import { renderWithStore } from "../render";
import { PdfActions } from "@/components/common/PdfActions";

const INVOICES: AllocatableInvoice[] = [
  { id: "new", number: "INV-2026-0012", dueDate: "2026-10-10", openPaisa: "370000000" },
  { id: "old", number: "INV-2026-0006", dueDate: "2026-06-17", openPaisa: "50000000", overdue: true },
];

describe("AllocationEditor", () => {
  it("auto fills oldest due first; the remainder is kept as credit", { timeout: 20_000 }, async () => {
    expect(autoAllocate(INVOICES, "100000000")).toEqual({ old: "50000000", new: "50000000" });
    expect(autoAllocate(INVOICES, "30000000")).toEqual({ old: "30000000" });
    expect(allocationSummary(INVOICES, { old: "50000000" }, "60000000")).toMatchObject({ allocated: BigInt(50000000), remainder: BigInt(10000000), overPayment: false });
    expect(allocationSummary(INVOICES, { old: "60000000" }, "60000000").overInvoice).toEqual(["old"]);

    function Harness() {
      const [value, setValue] = useState<Record<string, string | null>>({});
      return <AllocationEditor invoices={INVOICES} totalPaisa="500000000" value={value} onChange={setValue} />;
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Auto/ }));
    const summary = screen.getByTestId("allocation-summary");
    expect(within(summary).getByText("Rs 42,00,000")).toBeInTheDocument();
    expect(within(summary).getByText("Kept as credit")).toBeInTheDocument();
    expect(within(summary).getByText("Rs 8,00,000")).toBeInTheDocument();
  });

  it("flags more than the payment", () => {
    render(<AllocationEditor invoices={INVOICES} totalPaisa="10000000" value={{ old: "50000000" }} onChange={vi.fn()} />);
    expect(screen.getByText("More than received")).toBeInTheDocument();
  });
});

describe("StageTimeline", () => {
  it("shows each stage with its state, amount, invoice link and due / expected date", () => {
    render(
      <StageTimeline
        stages={[
          { id: "1", label: "Advance", percent: 15, amountPaisa: "277500000", status: "PAID", invoiceNumber: "INV-2026-0002", invoiceHref: "/x/1" },
          { id: "2", label: "Ground-floor slab", percent: 20, amountPaisa: "370000000", status: "PARTLY_PAID", invoiceNumber: "INV-2026-0010", invoiceHref: "/x/2", dueDate: "2026-09-03" },
          { id: "3", label: "Plaster", percent: 10, amountPaisa: "185000000", status: "READY" },
          { id: "4", label: "First-floor slab", percent: 15, amountPaisa: "277500000", status: "UPCOMING", expectedDate: "2026-11-19" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-status"))).toEqual(["PAID", "PARTLY_PAID", "READY", "UPCOMING"]);
    expect(within(items[0]!).getByText("Paid")).toHaveClass("sr-only");
    expect(within(items[1]!).getByRole("link", { name: "INV-2026-0010" })).toHaveAttribute("href", "/x/2");
    expect(within(items[1]!).getByText(/Due 3 Sep/)).toBeInTheDocument();
    expect(within(items[2]!).getByText("Ready to bill")).toBeInTheDocument();
    expect(within(items[3]!).getByText(/Expected 19 Nov/)).toBeInTheDocument();
    expect(within(items[0]!).getByText(/15% · Rs 27.75 L/)).toBeInTheDocument();
  });

  it("invoice badge shows overdue days", () => {
    render(<InvoiceStatusBadge status="PARTLY_PAID" overdueDays={33} />);
    expect(screen.getByText("Overdue 33 days")).toBeInTheDocument();
  });
});

describe("PdfActions", () => {
  it("builds the WhatsApp link from the phone and the ready message", { timeout: 20_000 }, async () => {
    expect(whatsappUrl("+92 300 111-2222", "Invoice INV-2026-0010 (Rs 37,00,000) & link")).toBe(
      "https://wa.me/923001112222?text=Invoice%20INV-2026-0010%20(Rs%2037%2C00%2C000)%20%26%20link",
    );
    expect(whatsappUrl(null, "hi")).toBe("https://wa.me/?text=hi");

    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const load = vi.fn().mockResolvedValue({ attachmentId: "a", url: "https://files/x.pdf", expiresAt: "", whatsappText: "Assalam o Alaikum", clientPhone: "+923001112222" });
    const user = userEvent.setup();
    renderWithStore(<PdfActions load={load} title="INV-2026-0010" />);
    await user.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(open).toHaveBeenCalledWith("https://wa.me/923001112222?text=Assalam%20o%20Alaikum", "_blank", "noopener");
    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(open).toHaveBeenLastCalledWith("https://files/x.pdf", "_blank", "noopener");
    open.mockRestore();
  });
});
