import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AllocationMap, Equipment, EquipmentTransfer, ProjectEquipment } from "@/api/types";
import { translate, translateEnum } from "@/i18n/useT";
import { COMPANY_NAV, PROJECT_NAV, visibleItemIds } from "@/lib/navigation";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const yard = { id: "loc-yard", type: "STORE" as const, name: "Central Store", projectId: null };
const site = { id: "loc-site", type: "SITE" as const, name: "DHA Phase 6 · 10 Marla", projectId: "p1" };
const plate = {
  id: "e-plate",
  name: "Steel plate 2×3",
  code: "SP-23",
  unit: "nos",
  kind: "BULK" as const,
  category: "SHUTTERING_PLATE" as const,
};
const mixer = {
  id: "e-mixer",
  name: "Mixer 1 bag",
  code: "MX-01",
  unit: "nos",
  kind: "MACHINE" as const,
  category: "MIXER" as const,
};

const MAP: AllocationMap = {
  locations: [
    {
      location: site,
      project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6" },
      items: [
        {
          equipment: plate,
          ownedQty: 240,
          rentedQty: 100,
          totalQty: 340,
          rentals: [{ id: "r1", number: "RNT-0003", qty: 100 }],
        },
      ],
    },
    {
      location: yard,
      project: null,
      items: [{ equipment: mixer, ownedQty: 1, rentedQty: 0, totalQty: 1, rentals: [] }],
    },
  ],
  totals: [
    { equipment: plate, ownedQty: 240, rentedQty: 100, atYardQty: 0, atSitesQty: 340, inTransitQty: 0 },
    { equipment: mixer, ownedQty: 1, rentedQty: 0, atYardQty: 1, atSitesQty: 0, inTransitQty: 0 },
  ],
};

const base = {
  serialNo: null,
  coverageSqftPerUnit: 6,
  isActive: true,
  notes: null,
  ownedQty: 400,
  rentedQty: 0,
  atSitesQty: 380,
  atYardQty: 20,
  inTransitQty: 0,
  createdAt: "2026-09-01T05:00:00.000Z",
  updatedAt: "2026-09-01T05:00:00.000Z",
};
/** What the API sends with fields.rates … */
const WITH_RATES: Equipment[] = [
  { ...plate, ...base, hireRatePaisaPerDay: "500", replacementValuePaisa: "450000" },
];
/** … and without (money keys left out). */
const WITHOUT_RATES: Equipment[] = [{ ...plate, ...base }];

const TRANSFER: EquipmentTransfer = {
  id: "t1",
  number: "ET-0007",
  kind: "DISPATCH",
  status: "ON_THE_WAY",
  from: yard,
  to: site,
  vehicleNo: "LES-4521",
  driverName: "Nadeem",
  note: null,
  sentAt: "2026-10-15T05:00:00.000Z",
  blindCount: false,
  items: [
    {
      id: "i1",
      equipment: plate,
      rental: null,
      sentQty: 40,
      receivedQty: null,
      damagedQty: null,
      gapQty: null,
      note: null,
      photoUrl: null,
    },
  ],
  losses: [],
  receivedBy: null,
  receivedAt: null,
  receiveNote: null,
  cancelledAt: null,
  createdBy: { id: "u1", name: "Khalid Malik" },
  createdAt: "2026-10-15T05:00:00.000Z",
};

const state = vi.hoisted(() => ({ rates: true }));
const mutation = () => [vi.fn(), { isLoading: false }];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/equipment/owned",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/api/services/equipment.api", () => ({
  useGetEquipmentBalancesQuery: () => ({ data: MAP, isLoading: false }),
  useGetEquipmentListQuery: () => ({
    data: {
      items: state.rates ? WITH_RATES : WITHOUT_RATES,
      meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
    },
    isLoading: false,
    isFetching: false,
  }),
  useGetProjectEquipmentQuery: () => ({
    data: {
      site,
      items: [
        {
          equipment: plate,
          ownedQty: 240,
          rentedQty: 100,
          ...(state.rates ? { hireRatePaisaPerDay: "500", dailyHirePaisa: "120000" } : {}),
        },
      ],
      incoming: [TRANSFER],
      rentals: [],
      openLosses: [],
      ...(state.rates ? { hireToDatePaisa: "3600000", rentalToDatePaisa: "1500000" } : {}),
    } satisfies ProjectEquipment,
    isLoading: false,
  }),
  useCreateEquipmentMutation: mutation,
  useUpdateEquipmentMutation: mutation,
  useStockInEquipmentMutation: mutation,
  useAdjustEquipmentMutation: mutation,
  useCreateEquipmentTransferMutation: mutation,
  useReceiveEquipmentTransferMutation: mutation,
  useCreateRentalMutation: mutation,
  useExtendRentalMutation: mutation,
  useReturnRentalMutation: mutation,
  useCloseRentalMutation: mutation,
  useReportEquipmentLossMutation: mutation,
  useChargeEquipmentLossMutation: mutation,
}));
vi.mock("@/api/services/inventory.api", () => ({
  useGetStockLocationsQuery: () => ({ data: [yard, site] }),
}));
vi.mock("@/api/services/labor.api", () => ({
  useGetSubcontractsQuery: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/features/procurement/options", () => ({
  useSiteProjectOptions: () => ({
    options: [{ value: "p1", label: "DHA Phase 6", description: "MSB-2026-012" }],
    loading: false,
  }),
  useSupplierOptions: () => ({ options: [], loading: false }),
}));
vi.mock("@/features/projects/views/ProjectModeViews", () => ({
  ProjectPageShell: ({
    children,
    actions,
  }: {
    children: (p: unknown, f: unknown) => ReactNode;
    actions?: (p: unknown) => ReactNode;
  }) => (
    <div>
      {actions?.({ id: "p1", status: "ACTIVE" })}
      {children({ id: "p1", status: "ACTIVE" }, { canEdit: true, readOnly: false })}
    </div>
  ),
}));

const { AllocationMapView } = await import("@/features/equipment/views/AllocationMapView");
const { OwnedEquipmentView } = await import("@/features/equipment/views/OwnedEquipmentViews");
const { SiteEquipmentView } = await import("@/features/equipment/views/SiteEquipmentView");
const { ReceiveTransferSlideOver, previewLosses } =
  await import("@/features/equipment/components/TransferSlideOvers");

describe("Equipment — allocation map", () => {
  it("shows one card per place with owned vs rented and the rental numbers", () => {
    renderWithStore(<AllocationMapView />, { me: meFixture("THEKEDAR") });
    const siteCard = screen.getByTestId("location-loc-site");
    expect(within(siteCard).getByText("Steel plate 2×3")).toBeInTheDocument();
    expect(within(siteCard).getByText("RNT-0003: 100 nos")).toBeInTheDocument();
    expect(within(siteCard).getByText("240 own + 100 rented")).toBeInTheDocument();
    const yardCard = screen.getByTestId("location-loc-yard");
    expect(within(yardCard).getByText("Mixer 1 bag")).toBeInTheDocument();
    // The Central Store is shown as the yard.
    expect(screen.getAllByText("Yard").length).toBeGreaterThan(0);
  });
});

describe("Equipment — money is gated by fields.rates", () => {
  it("the owner sees hire rate and replacement value", () => {
    state.rates = true;
    renderWithStore(<OwnedEquipmentView />, { me: meFixture("THEKEDAR") });
    expect(screen.getByRole("columnheader", { name: "Hire rate / day" })).toBeInTheDocument();
    expect(screen.getByText("Rs 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add equipment/ })).toBeInTheDocument();
  });

  it("the Munshi never sees rates or amounts (and can't add equipment)", () => {
    state.rates = false;
    renderWithStore(<OwnedEquipmentView />, { me: meFixture("MUNSHI") });
    expect(screen.queryByRole("columnheader", { name: "Hire rate / day" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Replacement value" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Rs /)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add equipment/ })).not.toBeInTheDocument();
    expect(screen.getByText("Steel plate 2×3")).toBeInTheDocument();
  });

  it("Equipment on Site: the Munshi sees counts and can receive, without hire money", () => {
    state.rates = false;
    renderWithStore(<SiteEquipmentView projectId="p1" />, { me: meFixture("MUNSHI") });
    expect(screen.queryByText("Hire to date")).not.toBeInTheDocument();
    expect(screen.queryByText(/Rs /)).not.toBeInTheDocument();
    expect(screen.getByText("ET-0007")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Receive/ })).toBeInTheDocument();
    // Munshi may report a loss but not send equipment.
    expect(screen.getByRole("button", { name: /Report loss/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send \/ return/ })).not.toBeInTheDocument();
  });

  it("Equipment on Site: the owner sees hire and rent to date", () => {
    state.rates = true;
    renderWithStore(<SiteEquipmentView projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Hire to date")).toBeInTheDocument();
    expect(screen.getByText("Rs 36,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send \/ return/ })).toBeInTheDocument();
  });
});

describe("Equipment — receiving with counts", () => {
  it("works out the losses: sent − received → missing, damaged → damaged", () => {
    expect(previewLosses(TRANSFER, [{ itemId: "i1", receivedQty: "38", damagedQty: "3" }])).toEqual([
      { name: "Steel plate 2×3", unit: "nos", kind: "MISSING", qty: 2 },
      { name: "Steel plate 2×3", unit: "nos", kind: "DAMAGED", qty: 3 },
    ]);
    expect(previewLosses(TRANSFER, [{ itemId: "i1", receivedQty: "40", damagedQty: null }])).toEqual([]);
    // Nothing counted yet → no preview.
    expect(previewLosses(TRANSFER, [{ itemId: "i1", receivedQty: null, damagedQty: null }])).toEqual([]);
  });

  it("a gap in the count shows the loss preview before saving", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    renderWithStore(<ReceiveTransferSlideOver transfer={TRANSFER} open onOpenChange={() => {}} />, {
      me: meFixture("MUNSHI"),
    });
    expect(screen.queryByTestId("loss-preview")).not.toBeInTheDocument();
    expect(screen.getByText("Sent: 40 nos")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Arrived \(counted\)/), "37");
    const preview = await screen.findByTestId("loss-preview");
    expect(within(preview).getByText("Missing")).toBeInTheDocument();
    expect(within(preview).getByText(/3 nos Steel plate/)).toBeInTheDocument();
    expect(screen.getByText("Saving will record these losses")).toBeInTheDocument();
  });

  it("a blind count hides the sent quantity and explains the gap", () => {
    const blind = {
      ...TRANSFER,
      blindCount: true,
      items: TRANSFER.items.map(({ sentQty: _sent, ...i }) => i),
    };
    renderWithStore(<ReceiveTransferSlideOver transfer={blind} open onOpenChange={() => {}} />, {
      me: meFixture("MUNSHI"),
    });
    expect(screen.queryByText(/Sent:/)).not.toBeInTheDocument();
    expect(screen.getByText("Count without the list")).toBeInTheDocument();
    expect(screen.getByText(/recorded as missing when you save/)).toBeInTheDocument();
  });
});

describe("Equipment — navigation and language", () => {
  it("menu items follow the equipment keys", () => {
    const owner = visibleItemIds(meFixture("THEKEDAR"), COMPANY_NAV);
    expect(owner).toEqual(
      expect.arrayContaining([
        "equipment.map",
        "equipment.owned",
        "equipment.rentals",
        "equipment.movements",
        "equipment.loss",
        "equipment.charges",
        "equipment.shuttering",
      ]),
    );
    expect(visibleItemIds(meFixture("MUNSHI"), PROJECT_NAV)).toContain("p.site.equipment");
    const noEquipment = meFixture("PM", { permissions: ["projects.project.view"] });
    expect(visibleItemIds(noEquipment, COMPANY_NAV).filter((id) => id.startsWith("equipment."))).toEqual([]);
    expect(visibleItemIds(noEquipment, PROJECT_NAV)).not.toContain("p.site.equipment");
    // Step 16 part 2: the shuttering demand planner is live.
    expect(COMPANY_NAV.flatMap((s) => s.items).find((i) => i.id === "equipment.shuttering")?.available).toBe(
      true,
    );
  });

  it("has Roman Urdu and Urdu texts", () => {
    expect(translate("en", "equipment.loss.title")).toBe("Loss & Damage");
    expect(translate("roman-ur", "equipment.loss.title")).toBe("Nuqsan");
    expect(translate("ur", "equipment.loss.title")).toBe("نقصان");
    expect(translateEnum("ur", "equipmentCategory", "SHUTTERING_PLATE")).toBe("شٹرنگ پلیٹ");
    expect(translate("ur", "status.equipmentTransfer.RECEIVED_WITH_GAP")).not.toBe(
      translate("en", "status.equipmentTransfer.RECEIVED_WITH_GAP"),
    );
  });
});
