import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EstimateSettingsModal } from "@/features/projects/estimate/EstimateSettingsModal";
import { fmtUp, formulaText, lineText, unitText } from "@/features/projects/estimate/labels";
import { translate, type TranslationKey, type TranslationVars } from "@/i18n/useT";
import { ESTIMATE_DEFAULTS as DEFAULTS, estimateFixture as estimate, slabSteel } from "../estimateFixture";
import { renderWithStore } from "../render";

const save = vi.fn();
vi.mock("@/api/services/projects.api", () => ({
  useUpdateEstimateSettingsMutation: () => [save, { isLoading: false }],
}));

const en = (key: TranslationKey, vars?: TranslationVars) => translate("en", key, vars);
const ur = (key: TranslationKey, vars?: TranslationVars) => translate("ur", key, vars);

describe("estimate labels", () => {
  it("formula in English and Urdu with formatted numbers; unknown keys fall back to the API text", () => {
    expect(formulaText(en, slabSteel.formula, slabSteel.formulaText)).toBe("468.75 cft × 1% × 222 kg per cft");
    expect(formulaText(ur, slabSteel.formula, slabSteel.formulaText)).toBe("468.75 مکعب فٹ × 1% × 222 kg فی مکعب فٹ");
    expect(formulaText(en, { key: "slab", params: { area: 3950, thicknessIn: 5 } }, "")).toBe("Footprint 3,950 sq ft × 5″");
    expect(formulaText(en, { key: "somethingNew", params: {} }, "fallback text")).toBe("fallback text");
  });

  it("line, unit and rounding helpers", () => {
    expect(lineText(en, slabSteel)).toBe("Steel (sarya)");
    expect(lineText(en, { ...slabSteel, kind: "WORK", material: null, measure: "SHUTTERING" })).toBe("Roof slab — shuttering");
    expect(unitText(en, "bag")).toBe("bags");
    expect(unitText(ur, "cft")).toBe("مکعب فٹ");
    expect(unitText(en, "coil")).toBe("coil");
    expect(fmtUp(289.04)).toBe("290");
    expect(fmtUp(38849)).toBe("38,849");
  });
});

describe("EstimateSettingsModal", () => {
  beforeEach(() => {
    save.mockReset();
    save.mockImplementation(() => ({ unwrap: () => Promise.resolve(estimate()) }));
  });

  it("shows the Pakistani defaults with their units; saves the whole form", async () => {
    const onClose = vi.fn();
    renderWithStore(<EstimateSettingsModal projectId="p1" estimate={estimate()} canManage locked={false} onClose={onClose} />);
    expect(screen.getByText("Estimate assumptions")).toBeInTheDocument();
    expect(screen.getByLabelText(/^External wall thickness/)).toHaveValue("9");
    expect(screen.getByLabelText(/^Internal wall thickness/)).toHaveValue("4.5");
    expect(screen.getAllByText("Default 9 inches").length).toBeGreaterThan(0);
    expect(screen.getByText("0 changed from the defaults")).toBeInTheDocument();
    // Reset is pointless while nothing is customised
    expect(screen.getByRole("button", { name: "Reset to defaults" })).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "RCC & steel" }));
    const slab = screen.getByLabelText(/^Roof slab thickness/);
    await user.clear(slab);
    await user.type(slab, "6");
    expect(screen.getByText("1 changed from the defaults")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0]).toMatchObject({ projectId: "p1", body: { ...DEFAULTS, slabThicknessIn: 6 } });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("out-of-range values are refused before saving", async () => {
    renderWithStore(<EstimateSettingsModal projectId="p1" estimate={estimate()} canManage locked={false} onClose={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "RCC & steel" }));
    const slab = screen.getByLabelText(/^Roof slab thickness/);
    await user.clear(slab);
    await user.type(slab, "12");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Roof slab thickness must be between 4 and 9")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("reset sends an empty body", async () => {
    renderWithStore(<EstimateSettingsModal projectId="p1" estimate={estimate({ slabThicknessIn: 6 }, ["slabThicknessIn"])} canManage locked={false} onClose={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Reset to defaults" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ projectId: "p1", body: {} }));
  });

  it("read-only without projects.estimate.manage: fields disabled, no save or reset", () => {
    renderWithStore(<EstimateSettingsModal projectId="p1" estimate={estimate()} canManage={false} locked={false} onClose={vi.fn()} />);
    expect(screen.getByText("You can see the assumptions but not change them.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^External wall thickness/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset to defaults" })).toBeNull();
  });
});
