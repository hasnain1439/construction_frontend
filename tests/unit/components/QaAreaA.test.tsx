/**
 * QA area A fixes (web): no-access error state (QA-A-25), Urdu month names (QA-A-10), milestone names
 * by key (QA-A-10), BoQ units and a rate adjustment on a "No rate" line (QA-A-11 / 28), short-unit
 * number inputs (QA-A-12), focus on the first invalid field (QA-A-06), Gantt bars from the actual
 * start (QA-A-18), estimate / quote warnings from their code (QA-A-10).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { Milestone, ScheduleDetail } from "@/api/types";
import { ErrorState } from "@/components/common/ErrorState";
import { Form } from "@/components/forms/Form";
import { NumberField, NumberInput } from "@/components/forms/NumberField";
import { BoqTable } from "@/features/estimates/BoqTable";
import { boqRateUnit, boqUnit, ruleDescText, ruleUnitText } from "@/features/estimates/labels";
import { useEstimateWarningText } from "@/features/projects/estimate/warningText";
import { buildGanttModel, DAY_PX, diffDays } from "@/features/schedule/gantt/ganttModel";
import { useMilestoneName } from "@/features/schedule/labels";
import { translate, type TranslationKey } from "@/i18n/useT";
import { formatDate, localizeMonths } from "@/lib/dates";
import { boqLine } from "../boqFixture";
import { renderWithStore } from "../render";
import { makeStore } from "@/store";
import { initialUiState } from "@/store/slices/uiSlice";

const t = (language: "en" | "ur" | "roman-ur") => (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("QA-A-25 no access", () => {
  it("a 404 says 'not available' and offers no useless retry; other errors keep the retry", () => {
    const { unmount } = renderWithStore(<ErrorState error={{ status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found" }} onRetry={() => undefined} />);
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    unmount();
    renderWithStore(<ErrorState error={{ status: 500, code: "INTERNAL_ERROR", message: "x" }} onRetry={() => undefined} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("QA-A-10 Urdu month names", () => {
  it("Urdu-script pages get Urdu months; English and Roman keep 'Oct'", () => {
    expect(formatDate("2026-10-15")).toBe("15 Oct 2026");
    document.documentElement.lang = "ur";
    expect(localizeMonths("15 Oct 2026")).toBe("15 اکتوبر 2026");
    expect(formatDate("2026-11-01")).toContain("نومبر");
    document.documentElement.lang = "ur-Latn";
    expect(formatDate("2026-11-01")).toBe("1 Nov 2026");
  });
});

describe("QA-A-10 milestone names", () => {
  // One mechanism (merged with QA-B-26): the API sends templateKey for a generated milestone that
  // kept its generated name (null once renamed); the web translates enum.milestoneTemplate.<key>.
  it("translated from the template key; a renamed or custom milestone keeps its own name", () => {
    const { result: ur } = renderHook(() => useMilestoneName(), {
      wrapper: ({ children }) => <Store language="ur">{children}</Store>,
    });
    expect(ur.current({ templateKey: "GF_STRUCTURE.WALLS", name: "Ground floor — columns & brickwork" })).toBe("گراؤنڈ فلور — کالم اور چنائی");
    expect(ur.current({ templateKey: "FOUNDATION_PLINTH.EXCAVATION", name: "Excavation (khudai)" })).toBe("کھدائی");
    expect(ur.current({ templateKey: null, name: "Khudai by machine" })).toBe("Khudai by machine");
    expect(ur.current({ templateKey: "X.UNKNOWN", name: "Something" })).toBe("Something");
  });
});

describe("QA-A-10 / 28 units and rulebook texts", () => {
  it("rate units are singular and translated whatever the price list's case; plurals too", () => {
    expect(boqRateUnit(t("en"), "TON")).toBe("ton");
    expect(boqRateUnit(t("en"), "BRICK")).toBe("brick");
    expect(boqRateUnit(t("en"), "SQFT")).toBe("sq ft");
    expect(boqUnit(t("en"), "TON")).toBe("tons");
    expect(boqRateUnit(t("ur"), "ton")).toBe("ٹن");
    expect(boqUnit(t("ur"), "gallon")).toBe("گیلن");
    expect(boqUnit(t("en"), "carton")).toBe("carton");
  });

  it("rulebook descriptions and units follow the language; unknown keys keep the API text", () => {
    const p = { key: "bricksPerCft", description: "English", unit: "bricks / cft" };
    expect(ruleDescText(t("ur"), p)).not.toBe("English");
    expect(ruleUnitText(t("ur"), p)).toContain("مکعب فٹ");
    expect(ruleDescText(t("ur"), { ...p, key: "newKey" })).toBe("English");
  });
});

describe("QA-A-10 warnings from their code", () => {
  it("a quote / BoQ warning is shown in Urdu, the English message only for an unknown code", () => {
    const { result } = renderHook(() => useEstimateWarningText(), { wrapper: ({ children }) => <Store language="ur">{children}</Store> });
    const steel = result.current({ code: "STEEL_NORM_DEVIATION", message: "Steel works out to 2.34 kg …", params: { actual: 2.34, norm: 4, percent: -41 } });
    expect(steel).not.toContain("Steel works out");
    expect(steel).toContain("2.34");
    expect(result.current({ code: "RATES_MISSING", message: "No price-list rate for: termite", items: ["termite"] })).not.toContain("No price-list rate");
    expect(result.current({ code: "SOMETHING_NEW", message: "As sent" })).toBe("As sent");
  });
});

describe("QA-A-11 a rate typed in on a 'No rate' line", () => {
  it("shows the adjusted rate, not the 'No rate' badge", () => {
    const line = boqLine({
      lineKey: "FLOORING_TILES.FINISHING.wallTiles",
      section: "FLOORING_TILES",
      material: "wallTiles",
      description: "Wall tiles",
      unit: "sqft",
      rateStatus: "RATE_MISSING",
      ratePaisa: null,
      rateUnit: null,
      effectiveRatePaisa: "18000",
      amountPaisa: "10718300",
      override: { quantity: null, ratePaisa: "18000", note: "Market rate", by: null, at: "2026-10-17T10:00:00.000Z" },
    });
    renderWithStore(<BoqTable sections={[{ section: "FLOORING_TILES", lines: [line] }]} totals={{ totalPaisa: "10718300" }} money />);
    expect(screen.queryByText("No rate")).toBeNull();
    expect(screen.getByText(/Rs 180 \/ sq ft/)).toBeInTheDocument();
  });
});

describe("QA-A-12 short units", () => {
  it("'×' leaves room for the number (less end padding than a long unit)", () => {
    const { container } = render(<NumberInput aria-label="Qty" value={1} onChange={() => undefined} unit="×" />);
    expect(container.querySelector("input")?.className).toContain("pr-7");
  });
});

describe("QA-A-06 invalid submit", () => {
  it("focuses the first invalid field (a Controller-rendered number input) and calls onInvalid", async () => {
    const schema = z.object({ size: z.number({ error: "Required" }).nullable().refine((v) => v !== null, "Required") });
    let invalid = 0;
    function Demo() {
      const form = useForm<{ size: number | null }>({ resolver: zodResolver(schema), defaultValues: { size: null } });
      return (
        <Form form={form} onSubmit={() => undefined} onInvalid={() => void invalid++} id="demo">
          <NumberField name="size" label="Footing size" />
          <button type="submit">Save</button>
        </Form>
      );
    }
    renderWithStore(<Demo />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Footing size/)));
    expect(invalid).toBe(1);
  });
});

describe("QA-A-18 Gantt bar from the actual start", () => {
  it("work started before its planned start is drawn from the actual start", () => {
    const m = {
      id: "m1",
      projectId: "p1",
      scheduleId: "s1",
      stageId: "st1",
      stageKey: "FOUNDATION_PLINTH",
      key: "FOUNDATION_PLINTH.EXCAVATION",
      name: "Excavation (khudai)",
      sortOrder: 1,
      workDays: 3,
      durationDays: 3,
      plannedStart: "2026-11-02",
      plannedEnd: "2026-11-04",
      curingDays: 0,
      curingUntil: null,
      startNoEarlierThan: null,
      status: "IN_PROGRESS",
      progressPercent: 50,
      actualStart: "2026-10-17",
      actualEnd: null,
      baselineStart: null,
      baselineEnd: null,
      late: false,
      dependsOn: [],
    } as unknown as Milestone;
    const detail = {
      schedule: { id: "s1", startDate: "2026-11-02" },
      today: "2026-10-17",
      stages: [{ id: "st1", stageKey: "FOUNDATION_PLINTH", name: "Foundation", sortOrder: 1, plannedStart: "2026-11-02", plannedEnd: "2026-11-04" }],
      milestones: [m],
      stoppages: [],
      calendar: { workingDays: [1, 2, 3, 4, 5, 6], holidays: [], ramadanPeriods: [] },
      plannedEnd: "2026-11-04",
      baselineEnd: null,
      projectedEnd: null,
    } as unknown as ScheduleDetail;
    const model = buildGanttModel(detail)!;
    const row = model.rows.find((r) => r.id === "m1");
    if (row?.kind !== "milestone") throw new Error("no row");
    expect(row.bar.x).toBe(diffDays(model.start, "2026-10-17") * DAY_PX);
    expect(row.bar.x + row.bar.width).toBe((diffDays(model.start, "2026-11-04") + 1) * DAY_PX);
  });
});

function Store({ language, children }: { language: "en" | "ur"; children: ReactNode }) {
  const [store] = useState(() => makeStore({ auth: { me: null, status: "unknown" }, ui: { ...initialUiState, language } }));
  return <Provider store={store}>{children}</Provider>;
}
