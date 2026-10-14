import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST } from "@/api/tags";
import type {
  ApiError,
  CreateOpeningBalanceBody,
  DemoCreated,
  ImportEntity,
  ImportPreview,
  ImportResult,
  OpeningBalance,
  OpeningKind,
  SetupChecklist,
} from "@/api/types";

/** List tag of each importable entity. */
const ENTITY_TAG = {
  workers: "Workers",
  subcontractors: "Subcontractors",
  suppliers: "Suppliers",
  materials: "Materials",
  clients: "Clients",
} as const satisfies Record<ImportEntity, string>;

/** Everything the demo project touches (created and removed in one go). */
const DEMO_TAGS = [
  "Onboarding",
  "Projects",
  "Clients",
  "Workers",
  "Suppliers",
  "SupplierLedger",
  "Purchase",
  "Stock",
  "ProjectWorkers",
  "Attendance",
  "CashAccounts",
  "CashEntries",
  "Invoices",
  "Dashboard",
  "Finance",
  "Approvals",
  "Subscription",
] as const;

/** Balances an opening entry changes. */
const OPENING_TAGS = [
  "OpeningBalances",
  "Suppliers",
  "SupplierLedger",
  "CashAccounts",
  "CashEntries",
  "Stock",
  "Advances",
  "Dashboard",
  "Finance",
] as const;

function fileForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

/** Hands a downloaded file to the browser. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSetupChecklist: build.query<SetupChecklist, void>({
      query: () => ENDPOINTS.onboarding.checklist,
      providesTags: ["Onboarding"],
    }),
    dismissSetupChecklist: build.mutation<SetupChecklist, { dismissed: boolean }>({
      query: (body) => ({ url: ENDPOINTS.onboarding.dismiss, method: "POST", body }),
      invalidatesTags: ["Onboarding"],
    }),
    markRatesReviewed: build.mutation<SetupChecklist, void>({
      query: () => ({ url: ENDPOINTS.onboarding.ratesReviewed, method: "POST" }),
      invalidatesTags: ["Onboarding"],
    }),

    /** Downloads the .xlsx template straight to the browser (nothing kept in the store). */
    downloadImportTemplate: build.mutation<null, ImportEntity>({
      async queryFn(entity, _api, _extra, baseQuery) {
        const result = await baseQuery({
          url: ENDPOINTS.imports.template(entity),
          responseHandler: async (response) => (response.ok ? response.blob() : response.json()),
        });
        if (result.error) return { error: result.error as ApiError };
        saveBlob(result.data as Blob, `${entity}-import-template.xlsx`);
        return { data: null };
      },
    }),
    previewImport: build.mutation<ImportPreview, { entity: ImportEntity; file: File }>({
      query: ({ entity, file }) => ({
        url: ENDPOINTS.imports.preview(entity),
        method: "POST",
        body: fileForm(file),
      }),
    }),
    commitImport: build.mutation<ImportResult, { entity: ImportEntity; file: File; skipInvalid?: boolean }>({
      query: ({ entity, file, skipInvalid }) => ({
        url: ENDPOINTS.imports.commit(entity),
        method: "POST",
        body: fileForm(file),
        ...(skipInvalid ? { params: { skipInvalid: "true" } } : {}),
      }),
      invalidatesTags: (_r, _e, { entity }) => [{ type: ENTITY_TAG[entity], id: LIST }, "Onboarding"],
    }),

    getOpeningBalances: build.query<OpeningBalance[], { kind?: OpeningKind } | void>({
      query: (params) => ({
        url: ENDPOINTS.openingBalances.list,
        params: params?.kind ? { kind: params.kind } : undefined,
      }),
      providesTags: ["OpeningBalances"],
    }),
    createOpeningBalance: build.mutation<OpeningBalance, CreateOpeningBalanceBody>({
      query: (body) => ({ url: ENDPOINTS.openingBalances.list, method: "POST", body }),
      invalidatesTags: [...OPENING_TAGS],
    }),

    createDemo: build.mutation<DemoCreated, void>({
      query: () => ({ url: ENDPOINTS.demo.root, method: "POST" }),
      invalidatesTags: [...DEMO_TAGS],
    }),
    deleteDemo: build.mutation<{ removed: true; projectId: string; code: string }, void>({
      query: () => ({ url: ENDPOINTS.demo.root, method: "DELETE" }),
      invalidatesTags: [...DEMO_TAGS],
    }),
  }),
});

export const {
  useGetSetupChecklistQuery,
  useDismissSetupChecklistMutation,
  useMarkRatesReviewedMutation,
  useDownloadImportTemplateMutation,
  usePreviewImportMutation,
  useCommitImportMutation,
  useGetOpeningBalancesQuery,
  useCreateOpeningBalanceMutation,
  useCreateDemoMutation,
  useDeleteDemoMutation,
} = onboardingApi;
