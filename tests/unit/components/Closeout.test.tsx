import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Drawing, DrawingDetail, Handover, ProjectDetail, Retention, Snag } from "@/api/types";
import { COMPANY_NAV, PROJECT_NAV } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const photo = (id: string) => ({ id, mimeType: "image/jpeg", url: `https://files/${id}.jpg`, thumbUrl: `https://files/${id}-t.jpg` });
const rev = (n: number, latest: boolean) => ({
  id: `r${n}`,
  drawingId: "d1",
  revisionNo: n,
  isLatest: latest,
  approvedAt: n === 0 ? "2026-03-02" : null,
  notes: n === 0 ? "Society set" : "Window moved",
  file: { id: `f${n}`, fileName: `A-101 R${n}.pdf`, mimeType: "application/pdf", sizeBytes: 1000, url: `https://files/f${n}.pdf`, thumbUrl: null, expiresAt: "2026-10-16T10:10:00Z" },
  uploadedBy: { id: "u1", name: "Khalid Malik" },
  createdAt: "2026-06-18T09:30:00.000Z",
});
const DRAWING: Drawing = {
  id: "d1",
  projectId: "p1",
  folder: "ARCHITECTURAL",
  title: "Ground floor plan",
  number: "A-101",
  milestoneId: null,
  notes: null,
  revisionCount: 2,
  latest: rev(1, true),
  createdAt: "2026-03-02T07:00:00.000Z",
  updatedAt: "2026-06-18T09:30:00.000Z",
};
const DETAIL: DrawingDetail = { ...DRAWING, revisions: [rev(1, true), rev(0, false)] };

const snag = (over: Partial<Snag>): Snag => ({
  id: "s1",
  projectId: "p1",
  number: 1,
  code: "SN-001",
  roomId: null,
  room: { id: "rm1", name: "Master bedroom", floor: "First floor" },
  location: "East wall",
  description: "Plaster crack above the window",
  status: "OPEN",
  targetDate: "2026-10-10",
  overdue: true,
  inDefectPeriod: false,
  assignee: { type: "WORKER", id: "w1", name: "Ustad Akram" },
  beforePhotos: [photo("b1")],
  afterPhotos: [],
  fixNote: null,
  fixedAt: null,
  fixedBy: null,
  verifiedAt: null,
  verifiedBy: null,
  reopenCount: 0,
  lastReopenReason: null,
  cost: { attribution: "NONE", note: null, subcontractAssignmentId: null, postedTo: null, postedAt: null },
  clientId: null,
  createdBy: { id: "u3", name: "Rafaqat Ali" },
  createdAt: "2026-10-09T08:00:00.000Z",
  updatedAt: "2026-10-09T08:00:00.000Z",
  ...over,
});
const SNAGS = [
  snag({}),
  snag({ id: "s2", number: 2, code: "SN-002", description: "Paint patchy", status: "VERIFIED", overdue: false, cost: { attribution: "REWORK", amountPaisa: "1200000", note: null, subcontractAssignmentId: null, postedTo: "PROJECT_COST", postedAt: "2026-10-10T00:00:00Z" } }),
];
let snagSummary: Record<string, unknown> = { open: 1, fixed: 0, verified: 1, overdue: 1, defectPeriodOpen: 0, reworkPaisa: "1200000", deductionPaisa: "0", changeOrderPaisa: "0" };

const HANDOVER: Handover = {
  projectId: "p1",
  projectStatus: "CLOSEOUT",
  items: (["KEYS", "ELECTRICITY_CONNECTION", "GAS_CONNECTION", "WATER_CONNECTION", "WARRANTY_CARDS", "FINAL_DRAWINGS", "FINAL_PHOTOS"] as const).map((key, i) => ({
    key,
    done: i < 4,
    note: key === "KEYS" ? "3 sets" : null,
    attachments: [],
    doneAt: i < 4 ? "2026-10-12T10:00:00.000Z" : null,
    doneBy: i < 4 ? { id: "u2", name: "Bilal Ahmed" } : null,
  })),
  signOff: null,
  handedOverAt: null,
  defectPeriodMonths: 6,
  retentionDueDate: null,
  openSnags: 2,
  canComplete: false,
  blockers: ["ITEMS_PENDING", "SIGN_OFF_MISSING"],
  certificate: null,
};

const retention = (money: boolean): Retention => ({
  projectId: "p1",
  projectStatus: "HANDED_OVER",
  retentionPercent: 5,
  defectPeriodMonths: 6,
  handedOverAt: "2026-04-26",
  retentionDueDate: "2026-10-26",
  daysToDue: 10,
  reminder: { daysBefore: 14, reminderSentAt: "2026-10-12T21:45:00.000Z", dueNotifiedAt: null },
  client: { hasRetentionStage: true, stageLabel: "Retention", ...(money ? { amountPaisa: "21000000" } : {}), invoice: null, canInvoice: true },
  subcontractors: [
    { assignmentId: "a1", subcontractorId: "sc1", name: "Sharif Plaster Works", trade: "PLASTER", scope: "Internal plaster", retentionPercent: 5, ...(money ? { retentionHeldPaisa: "1525000", retentionReleasedPaisa: "0" } : {}), releaseDate: "2026-10-26", releasable: false },
  ],
  totals: money ? { clientHeldPaisa: "21000000", subcontractorHeldPaisa: "1525000" } : {},
  defectSnags: { total: 2, open: 1 },
});
let retentionData = retention(true);

const setItem = vi.fn();
const mutation = (fn = vi.fn()) => () => [fn, { isLoading: false }];
vi.mock("@/api/services/closeout.api", () => ({
  useGetDrawingsQuery: () => ({ data: { items: [DRAWING], folders: [{ folder: "ARCHITECTURAL", count: 1 }] }, isLoading: false }),
  useGetDrawingQuery: (_id: string, opts: { skip?: boolean }) => ({ data: opts.skip ? undefined : DETAIL, isFetching: false }),
  useGetSnagsQuery: () => ({ data: { items: SNAGS, summary: snagSummary, meta: { page: 1, limit: 25, total: 2, totalPages: 1 } }, isLoading: false }),
  useGetSnagQuery: (_id: string, opts: { skip?: boolean }) => ({ data: opts.skip ? undefined : SNAGS[0], isFetching: false }),
  useGetHandoverQuery: () => ({ data: HANDOVER, isLoading: false }),
  useGetRetentionQuery: () => ({ data: retentionData, isLoading: false }),
  useCreateDrawingMutation: mutation(),
  useUpdateDrawingMutation: mutation(),
  useDeleteDrawingMutation: mutation(),
  useAddRevisionMutation: mutation(),
  useUpdateRevisionMutation: mutation(),
  useCreateSnagMutation: mutation(),
  useUpdateSnagMutation: mutation(),
  useDeleteSnagMutation: mutation(),
  useFixSnagMutation: mutation(),
  useVerifySnagMutation: mutation(),
  useReopenSnagMutation: mutation(),
  useSetSnagCostMutation: mutation(),
  useSetHandoverItemMutation: mutation(setItem),
  useSignOffHandoverMutation: mutation(),
  useCompleteHandoverMutation: mutation(),
  useGetHandoverCertificateMutation: mutation(),
  useUpdateRetentionSettingsMutation: mutation(),
}));
vi.mock("@/api/services/projects.api", () => ({ useGetFloorsQuery: () => ({ data: { floors: [] } }) }));
vi.mock("@/api/services/masterData.api", () => ({ useGetWorkersQuery: () => ({ data: { items: [] } }), useGetSubcontractorsQuery: () => ({ data: { items: [] } }) }));
vi.mock("@/api/services/labor.api", () => ({ useGetSubcontractsQuery: () => ({ data: [] }) }));
vi.mock("@/api/services/attachments.api", () => ({ useUploadAttachmentMutation: () => [vi.fn(), { isLoading: false }] }));
vi.mock("@/features/projects/views/ProjectModeViews", () => ({
  ProjectPageShell: ({ children, actions }: { children: (p: unknown) => ReactNode; actions?: (p: unknown) => ReactNode }) => (
    <div>
      {actions?.({ id: "p1", status: "CLOSEOUT" })}
      {children({ id: "p1", status: "CLOSEOUT" })}
    </div>
  ),
}));

const { DrawingsView } = await import("@/features/closeout/DrawingsView");
const { SnagsView } = await import("@/features/closeout/SnagsView");
const { HandoverBody, addMonths } = await import("@/features/closeout/HandoverView");
const { RetentionBody } = await import("@/features/closeout/RetentionView");

const PROJECT = { id: "p1", status: "CLOSEOUT", client: { id: "c1", name: "Ahmed Raza" } } as unknown as ProjectDetail;

describe("Closeout — navigation", () => {
  it("the four Documents & Closeout pages are live and gated by closeout permissions", () => {
    const section = PROJECT_NAV.find((s) => s.id === "p.documents")!;
    expect(section.items.every((i) => i.available)).toBe(true);
    const visible = (role: "THEKEDAR" | "PM" | "MUNSHI") => section.items.filter((i) => canAccess(meFixture(role), i.access)).map((i) => i.id);
    expect(visible("THEKEDAR")).toEqual(["p.docs.drawings", "p.docs.snags", "p.docs.handover", "p.docs.retention"]);
    expect(visible("PM")).toEqual(["p.docs.drawings", "p.docs.snags", "p.docs.handover", "p.docs.retention"]);
    expect(visible("MUNSHI")).toEqual(["p.docs.drawings", "p.docs.snags"]);
    expect(COMPANY_NAV.length).toBeGreaterThan(0);
  });
});

describe("Closeout — drawings", () => {
  it("lists the latest revision; history keeps superseded revisions; Munshi has no manage actions", async () => {
    const user = userEvent.setup();
    renderWithStore(<DrawingsView projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByRole("button", { name: "Add drawing" })).toBeInTheDocument();
    expect(screen.getByText("Ground floor plan")).toBeInTheDocument();
    expect(screen.getByText("R1")).toBeInTheDocument();
    await user.click(screen.getByText("Ground floor plan"));
    const r0 = await screen.findByTestId("revision-0");
    expect(within(r0).getByText("Superseded")).toBeInTheDocument();
    expect(within(screen.getByTestId("revision-1")).getByText("Latest")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload new revision" })).toBeInTheDocument();
  });

  it("Munshi sees the drawings but cannot add or upload", () => {
    renderWithStore(<DrawingsView projectId="p1" />, { me: meFixture("MUNSHI") });
    expect(screen.getByText("Ground floor plan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add drawing" })).toBeNull();
  });
});

describe("Closeout — snags", () => {
  beforeEach(() => {
    snagSummary = { open: 1, fixed: 0, verified: 1, overdue: 1, defectPeriodOpen: 0, reworkPaisa: "1200000", deductionPaisa: "0", changeOrderPaisa: "0" };
  });

  it("owner: KPIs with rework money, status badges, overdue flag, cost column with amount", () => {
    renderWithStore(<SnagsView projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Rework cost")).toBeInTheDocument();
    expect(screen.getAllByText("Rs 12,000").length).toBeGreaterThan(0);
    expect(screen.getByText("SN-001")).toBeInTheDocument();
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
    expect(screen.getByText("Our rework (project cost)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log a snag" })).toBeInTheDocument();
  });

  it("Munshi: can log snags, never sees money (no rework KPI, no amounts)", () => {
    snagSummary = { open: 1, fixed: 0, verified: 1, overdue: 1, defectPeriodOpen: 0 };
    renderWithStore(<SnagsView projectId="p1" />, { me: meFixture("MUNSHI") });
    expect(screen.getByRole("button", { name: "Log a snag" })).toBeInTheDocument();
    expect(screen.queryByText("Rework cost")).toBeNull();
    expect(screen.getByText("Past target date")).toBeInTheDocument();
    expect(screen.queryByText(/Rs /)).toBeNull();
  });

  it("opens the detail with before photos", async () => {
    const user = userEvent.setup();
    renderWithStore(<SnagsView projectId="p1" />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByText("Plaster crack above the window"));
    expect(await screen.findByText("Snag SN-001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open photo 1" })).toBeInTheDocument();
    expect(screen.getByText(/Logged by Rafaqat Ali/)).toBeInTheDocument();
  });
});

describe("Closeout — handover", () => {
  it("checklist progress, blockers, open snags; ticking an item saves it", async () => {
    setItem.mockReset();
    setItem.mockImplementation(() => ({ unwrap: () => Promise.resolve(HANDOVER) }));
    const user = userEvent.setup();
    renderWithStore(<HandoverBody project={PROJECT} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("4 of 7 done")).toBeInTheDocument();
    expect(screen.getByText("Tick every checklist item.")).toBeInTheDocument();
    expect(screen.getByText("2 snags are not verified yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hand over to owner" })).toBeDisabled();
    expect(screen.getByText("Record the owner's sign-off to make the certificate.")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Warranty cards" }));
    await waitFor(() => expect(setItem).toHaveBeenCalledWith({ projectId: "p1", key: "WARRANTY_CARDS", body: { done: true } }));
  });

  it("QA-A-19: a note on an open item keeps it open", async () => {
    setItem.mockReset();
    setItem.mockImplementation(() => ({ unwrap: () => Promise.resolve(HANDOVER) }));
    const user = userEvent.setup();
    renderWithStore(<HandoverBody project={PROJECT} />, { me: meFixture("THEKEDAR") });
    const row = screen.getByTestId("item-WARRANTY_CARDS");
    await user.click(within(row).getByRole("button", { name: "Details" }));
    await user.type(await screen.findByLabelText(/Note/), "Cards in the blue file");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setItem).toHaveBeenCalledWith({ projectId: "p1", key: "WARRANTY_CARDS", body: { done: false, note: "Cards in the blue file" } }));
  });

  it("a PM without projects.project.manage fills the checklist but cannot complete", () => {
    renderWithStore(<HandoverBody project={PROJECT} />, { me: meFixture("PM") });
    expect(screen.getByText(/Only the owner/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hand over to owner" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Warranty cards" })).not.toBeDisabled();
  });

  it("retention due date = handover + defect months (day clamped)", () => {
    expect(addMonths("2026-04-15", 6)).toBe("2026-10-15");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
  });
});

describe("Closeout — retention", () => {
  it("owner sees amounts and the due date; sub-contractor retention held until the same date", () => {
    retentionData = retention(true);
    renderWithStore(<RetentionBody projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("In 10 days")).toBeInTheDocument();
    expect(screen.getAllByText("Rs 2,10,000").length).toBeGreaterThan(0);
    expect(screen.getByText("Sharif Plaster Works")).toBeInTheDocument();
    expect(screen.getAllByText(/Held until/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Create retention invoice" })).toBeInTheDocument();
  });

  it("PM without amounts: dates yes, money hidden for the role", () => {
    retentionData = retention(false);
    renderWithStore(<RetentionBody projectId="p1" />, { me: meFixture("PM") });
    expect(screen.getByText("In 10 days")).toBeInTheDocument();
    expect(screen.queryByText(/Rs /)).toBeNull();
    expect(screen.getAllByText("Hidden for your role").length).toBeGreaterThan(0);
  });

  it("Urdu: page texts come from the Urdu dictionary", () => {
    retentionData = retention(true);
    renderWithStore(<RetentionBody projectId="p1" />, { me: meFixture("THEKEDAR"), ui: { language: "ur" } });
    expect(screen.getByText("ریٹینشن واجب")).toBeInTheDocument();
    expect(screen.getByText("ذیلی ٹھیکیداروں کی ریٹینشن")).toBeInTheDocument();
  });
});
