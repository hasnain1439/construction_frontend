import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  AccrualResult,
  AdjustEquipmentBody,
  AllocationMap,
  BalancesQuery,
  ChargeLossBody,
  CloseRentalBody,
  CreateEquipmentBody,
  CreateEquipmentTransferBody,
  CreateRentalBody,
  Equipment,
  EquipmentCharge,
  EquipmentChargesQuery,
  EquipmentDetail,
  EquipmentLoss,
  EquipmentLossesQuery,
  EquipmentMovement,
  EquipmentMovementsQuery,
  EquipmentQuery,
  EquipmentTransfer,
  EquipmentTransfersQuery,
  ExtendRentalBody,
  Paginated,
  ProjectEquipment,
  ReceiveEquipmentTransferBody,
  Rental,
  RentalsQuery,
  ReportLossBody,
  ReturnRentalBody,
  StockInBody,
  UpdateEquipmentBody,
} from "@/api/types";

/** Anything that moves equipment changes the balances, the movement log and the site pages. */
const MOVED = [
  { type: "Equipment" as const, id: LIST },
  { type: "EquipmentBalances" as const, id: LIST },
  { type: "EquipmentMovements" as const, id: LIST },
  { type: "ProjectEquipment" as const, id: LIST },
];

const equipmentChanged = (id?: string) => [...MOVED, ...(id ? [{ type: "Equipment" as const, id }] : [])];
const transferChanged = (id?: string) => [
  ...MOVED,
  { type: "EquipmentTransfers" as const, id: LIST },
  ...(id ? [{ type: "EquipmentTransfers" as const, id }] : []),
  // A counted gap creates losses.
  { type: "EquipmentLosses" as const, id: LIST },
];
const rentalChanged = (id?: string) => [
  ...MOVED,
  { type: "EquipmentRentals" as const, id: LIST },
  ...(id ? [{ type: "EquipmentRentals" as const, id }] : []),
  { type: "EquipmentCharges" as const, id: LIST },
  // Deposit, damage charges and rent post to the supplier ledger.
  { type: "SupplierLedger" as const, id: LIST },
  { type: "Suppliers" as const, id: LIST },
];
const lossChanged = (id?: string) => [
  ...MOVED,
  { type: "EquipmentLosses" as const, id: LIST },
  ...(id ? [{ type: "EquipmentLosses" as const, id }] : []),
  { type: "Finance" as const, id: LIST },
  { type: "SubcontractAccounts" as const, id: LIST },
];

export const equipmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ─── Register ───────────────────────────────────────────────────────────
    getEquipmentList: build.query<Paginated<Equipment>, EquipmentQuery | void>({
      query: (params) => ({ url: ENDPOINTS.equipment.list, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<Equipment>,
      providesTags: (page) => providesList(page?.items, "Equipment"),
    }),
    getEquipment: build.query<EquipmentDetail, string>({
      query: (id) => ENDPOINTS.equipment.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Equipment", id }],
    }),
    createEquipment: build.mutation<EquipmentDetail, CreateEquipmentBody>({
      query: (body) => ({ url: ENDPOINTS.equipment.list, method: "POST", body }),
      invalidatesTags: () => equipmentChanged(),
    }),
    updateEquipment: build.mutation<EquipmentDetail, { id: string; body: UpdateEquipmentBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => equipmentChanged(id),
    }),
    stockInEquipment: build.mutation<EquipmentDetail, { id: string; body: StockInBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.stockIn(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => equipmentChanged(id),
    }),
    adjustEquipment: build.mutation<EquipmentDetail, { id: string; body: AdjustEquipmentBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.adjust(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => equipmentChanged(id),
    }),

    // ─── Where everything is ────────────────────────────────────────────────
    getEquipmentBalances: build.query<AllocationMap, BalancesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.equipment.balances, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "EquipmentBalances", id: LIST }],
    }),
    getEquipmentMovements: build.query<Paginated<EquipmentMovement>, EquipmentMovementsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.equipment.movements, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<EquipmentMovement>,
      providesTags: [{ type: "EquipmentMovements", id: LIST }],
    }),
    getProjectEquipment: build.query<ProjectEquipment, string>({
      query: (projectId) => ENDPOINTS.equipment.project(projectId),
      providesTags: (_r, _e, projectId) => [
        { type: "ProjectEquipment", id: projectId },
        { type: "ProjectEquipment", id: LIST },
      ],
    }),

    // ─── Transfers ──────────────────────────────────────────────────────────
    getEquipmentTransfers: build.query<Paginated<EquipmentTransfer>, EquipmentTransfersQuery | void>({
      query: (params) => ({ url: ENDPOINTS.equipment.transfers, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<EquipmentTransfer>,
      providesTags: (page) => providesList(page?.items, "EquipmentTransfers"),
    }),
    getEquipmentTransfer: build.query<EquipmentTransfer, string>({
      query: (id) => ENDPOINTS.equipment.transferById(id),
      providesTags: (_r, _e, id) => [{ type: "EquipmentTransfers", id }],
    }),
    createEquipmentTransfer: build.mutation<EquipmentTransfer, CreateEquipmentTransferBody>({
      query: (body) => ({ url: ENDPOINTS.equipment.transfers, method: "POST", body }),
      invalidatesTags: () => transferChanged(),
    }),
    receiveEquipmentTransfer: build.mutation<
      EquipmentTransfer,
      { id: string; body: ReceiveEquipmentTransferBody }
    >({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.transferReceive(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => transferChanged(id),
    }),
    cancelEquipmentTransfer: build.mutation<EquipmentTransfer, string>({
      query: (id) => ({ url: ENDPOINTS.equipment.transferCancel(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => transferChanged(id),
    }),

    // ─── Rentals ────────────────────────────────────────────────────────────
    getRentals: build.query<Paginated<Rental>, RentalsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.equipment.rentals, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<Rental>,
      providesTags: (page) => providesList(page?.items, "EquipmentRentals"),
    }),
    getRental: build.query<Rental, string>({
      query: (id) => ENDPOINTS.equipment.rentalById(id),
      providesTags: (_r, _e, id) => [{ type: "EquipmentRentals", id }],
    }),
    createRental: build.mutation<Rental, CreateRentalBody>({
      query: (body) => ({ url: ENDPOINTS.equipment.rentals, method: "POST", body }),
      invalidatesTags: () => rentalChanged(),
    }),
    extendRental: build.mutation<Rental, { id: string; body: ExtendRentalBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.rentalExtend(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => rentalChanged(id),
    }),
    returnRental: build.mutation<Rental, { id: string; body: ReturnRentalBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.rentalReturn(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => rentalChanged(id),
    }),
    closeRental: build.mutation<Rental, { id: string; body: CloseRentalBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.rentalClose(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => rentalChanged(id),
    }),

    // ─── Losses ─────────────────────────────────────────────────────────────
    getEquipmentLosses: build.query<Paginated<EquipmentLoss>, EquipmentLossesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.equipment.losses, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<EquipmentLoss>,
      providesTags: (page) => providesList(page?.items, "EquipmentLosses"),
    }),
    reportEquipmentLoss: build.mutation<EquipmentLoss, ReportLossBody>({
      query: (body) => ({ url: ENDPOINTS.equipment.losses, method: "POST", body }),
      invalidatesTags: () => lossChanged(),
    }),
    chargeEquipmentLoss: build.mutation<EquipmentLoss, { id: string; body: ChargeLossBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.equipment.lossCharge(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => lossChanged(id),
    }),

    // ─── Daily charges ──────────────────────────────────────────────────────
    getEquipmentCharges: build.query<
      Paginated<EquipmentCharge, { totalPaisa?: string }>,
      EquipmentChargesQuery | void
    >({
      query: (params) => ({ url: ENDPOINTS.equipment.charges, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<EquipmentCharge, { totalPaisa?: string }>,
      providesTags: [{ type: "EquipmentCharges", id: LIST }],
    }),
    runEquipmentAccrual: build.mutation<AccrualResult, { through?: string } | void>({
      query: (body) => ({ url: ENDPOINTS.equipment.accrualsRun, method: "POST", body: body ?? {} }),
      invalidatesTags: [
        { type: "EquipmentCharges", id: LIST },
        { type: "EquipmentRentals", id: LIST },
        { type: "ProjectEquipment", id: LIST },
        { type: "Finance", id: LIST },
      ],
    }),
  }),
});

export const {
  useGetEquipmentListQuery,
  useGetEquipmentQuery,
  useCreateEquipmentMutation,
  useUpdateEquipmentMutation,
  useStockInEquipmentMutation,
  useAdjustEquipmentMutation,
  useGetEquipmentBalancesQuery,
  useGetEquipmentMovementsQuery,
  useGetProjectEquipmentQuery,
  useGetEquipmentTransfersQuery,
  useGetEquipmentTransferQuery,
  useCreateEquipmentTransferMutation,
  useReceiveEquipmentTransferMutation,
  useCancelEquipmentTransferMutation,
  useGetRentalsQuery,
  useGetRentalQuery,
  useCreateRentalMutation,
  useExtendRentalMutation,
  useReturnRentalMutation,
  useCloseRentalMutation,
  useGetEquipmentLossesQuery,
  useReportEquipmentLossMutation,
  useChargeEquipmentLossMutation,
  useGetEquipmentChargesQuery,
  useRunEquipmentAccrualMutation,
} = equipmentApi;
