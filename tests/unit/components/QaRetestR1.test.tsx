/**
 * QA re-test R1 (areas A + C): the non-text leftovers.
 * - QA-C-02: /site/deliveries opens with either permission, so each section asks only for what the user may read.
 * - R1-N1: warnings stored before params existed fall back to their stored message (no raw `{placeholder}`).
 * - R1-N5: a stage that already has a draft invoice is marked and can't be picked again.
 */
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleStage } from "@/api/types";
import { stageInvoiceOptions } from "@/features/billing/components/BillingSlideOvers";
import { useEstimateWarningText, type WarningLike } from "@/features/projects/estimate/warningText";
import { hasAllVars, translate, type TranslationKey, type TranslationVars } from "@/i18n/useT";
import { ACCOUNTANT_TEMPLATE } from "../permissionTemplates";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const calls = vi.hoisted(() => ({ dispatches: [] as unknown[], purchases: [] as unknown[], owner: [] as unknown[] }));
const result = { data: { items: [] }, isLoading: false, error: undefined, refetch: () => undefined };

vi.mock("@/api/services/dispatch.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/dispatch.api")>()),
  useGetDispatchesQuery: (_arg: unknown, opts?: { skip?: boolean }) => {
    calls.dispatches.push(opts?.skip ?? false);
    return result;
  },
  useGetOwnerDeliveriesQuery: (_arg: unknown, opts?: { skip?: boolean }) => {
    calls.owner.push(opts?.skip ?? false);
    return result;
  },
}));
vi.mock("@/api/services/procurement.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/procurement.api")>()),
  useGetPurchasesQuery: (_arg: unknown, opts?: { skip?: boolean }) => {
    calls.purchases.push(opts?.skip ?? false);
    return result;
  },
}));
vi.mock("@/features/projects/views/ProjectModeViews", () => ({
  ProjectPageShell: ({ children, actions }: { children: (p: unknown) => ReactNode; actions?: (p: unknown) => ReactNode }) => {
    const project = { id: "p1", status: "ACTIVE", supplyRules: [] };
    return (
      <div>
        {actions?.(project)}
        {children(project)}
      </div>
    );
  },
}));

const { DeliveriesView } = await import("@/features/site/SiteViews");

beforeEach(() => {
  calls.dispatches = [];
  calls.purchases = [];
  calls.owner = [];
});

describe("QA-C-02: site deliveries asks only for what the user may read", () => {
  it("Accountant (purchases only): no /dispatches or /owner-deliveries call, no owner tab, no record buttons", () => {
    renderWithStore(<DeliveriesView projectId="p1" />, { me: meFixture("PM", { permissions: [...ACCOUNTANT_TEMPLATE] }) });
    expect(calls.dispatches.every(Boolean)).toBe(true);
    expect(calls.owner.every(Boolean)).toBe(true);
    expect(calls.purchases.some((skip) => !skip)).toBe(true);
    expect(screen.getByRole("tab", { name: /Received/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Owner deliveries" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Record site purchase/ })).toBeNull();
  });

  it("owner deliveries only: the received list is not fetched and the owner tab is the one shown", () => {
    renderWithStore(<DeliveriesView projectId="p1" />, { me: meFixture("PM", { permissions: ["projects.project.view", "inventory.ownerdelivery.view"] }) });
    expect(calls.dispatches.every(Boolean)).toBe(true);
    expect(calls.purchases.every(Boolean)).toBe(true);
    expect(calls.owner.some((skip) => !skip)).toBe(true);
    expect(screen.queryByRole("tab", { name: /received/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "Owner deliveries" })).toBeInTheDocument();
  });

  it("owner: every section is fetched", () => {
    renderWithStore(<DeliveriesView projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect([calls.dispatches, calls.purchases, calls.owner].every((c) => c.length > 0 && c.every((skip) => !skip))).toBe(true);
    expect(screen.getByRole("tab", { name: "Owner deliveries" })).toBeInTheDocument();
  });
});

function Warnings({ warnings }: { warnings: WarningLike[] }) {
  const text = useEstimateWarningText();
  return (
    <ul>
      {warnings.map((w) => (
        <li key={w.code}>{text(w)}</li>
      ))}
    </ul>
  );
}

describe("R1-N1: legacy quote warnings (code + message, no params)", () => {
  const LEGACY: WarningLike[] = [
    { code: "STEEL_NORM_DEVIATION", message: "Steel works out to 3.1 kg per sq ft, 40% off the norm of 2.2." },
    { code: "RATES_MISSING", message: "No price-list rate for: Termite chemical." },
  ];

  it.each(["en", "roman-ur", "ur"] as const)("%s: shows the stored message, never a raw {placeholder} or an empty list", (language) => {
    renderWithStore(<Warnings warnings={LEGACY} />, { me: meFixture("THEKEDAR"), ui: { language } });
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items).toEqual([LEGACY[0]!.message, LEGACY[1]!.message]);
    expect(items.join(" ")).not.toMatch(/\{\w+\}/);
  });

  it("new warnings with params are still translated", () => {
    renderWithStore(<Warnings warnings={[{ code: "STEEL_NORM_DEVIATION", message: "x", params: { actual: 3.1, percent: 40, norm: 2.2 } }, { code: "RATES_MISSING", message: "y", materials: ["Termite chemical"] }]} />, {
      me: meFixture("THEKEDAR"),
      ui: { language: "roman-ur" },
    });
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items[0]).toContain("3.1");
    expect(items[0]).not.toBe("x");
    expect(items[1]).toContain("Termite chemical");
  });

  it("translate() never leaves a raw {placeholder} when a value is missing; hasAllVars tells", () => {
    const key = "projects.estimate.warn.STEEL_NORM_DEVIATION" as TranslationKey;
    const partial: TranslationVars = { actual: 3.1 };
    for (const language of ["en", "roman-ur", "ur"] as const) expect(translate(language, key, partial)).not.toMatch(/\{\w+\}/);
    expect(hasAllVars(key, partial)).toBe(false);
    expect(hasAllVars(key, { actual: 3.1, percent: 40, norm: 2.2 })).toBe(true);
    expect(hasAllVars("projects.estimate.warn.RATES_MISSING" as TranslationKey, { materials: "" })).toBe(false);
  });
});

describe("R1-N5: New invoice stage picker", () => {
  const stage = (over: Partial<ScheduleStage>): ScheduleStage =>
    ({
      id: "s1",
      sortOrder: 1,
      label: "Grey structure — ground floor",
      percent: 20,
      isRetention: false,
      amountPaisa: "150000000",
      status: "UPCOMING",
      expectedDate: null,
      readyAt: null,
      readyById: null,
      readyNote: null,
      proofAttachmentIds: [],
      invoice: null,
      ...over,
    }) as ScheduleStage;
  const t = (key: TranslationKey, vars?: TranslationVars) => translate("en", key, vars);

  it("a stage with a draft invoice is marked 'draft invoice exists' and disabled; the others stay pickable", () => {
    const options = stageInvoiceOptions(
      [
        stage({ id: "drafted", invoice: { id: "i1", number: null, status: "DRAFT", dueDate: null, totalPaisa: "150000000", balancePaisa: "150000000" } }),
        stage({ id: "free", label: "Grey structure — first floor & roof" }),
        stage({ id: "ready", label: "Plinth", status: "READY" }),
      ],
      t,
    );
    expect(options).toEqual([
      { value: "drafted", disabled: true, label: expect.stringContaining("(draft invoice exists)") },
      { value: "free", disabled: false, label: expect.stringContaining("(not ready)") },
      { value: "ready", disabled: false, label: "Plinth — 20% · Rs 15,00,000" },
    ]);
  });
});
