import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  OfficeExpense,
  OfficeExpenseBody,
  OfficeExpenseCategory,
  OfficeExpensePatch,
  OfficeExpensesMeta,
  OfficeExpensesQuery,
  Paginated,
} from "@/api/types";

const CATEGORIES_LIST = { type: "OfficeExpenseCategories" as const, id: LIST };
const EXPENSES_LIST = { type: "OfficeExpenses" as const, id: LIST };

/** Office expenses (rent, bills, salaries …): company running costs, not tied to a project. */
export const officeExpensesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOfficeExpenses: build.query<Paginated<OfficeExpense, OfficeExpensesMeta>, OfficeExpensesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.officeExpenses.list, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<OfficeExpense, OfficeExpensesMeta>,
      providesTags: (page) => providesList(page?.items, "OfficeExpenses"),
    }),
    // An expense changes its category's expense count too.
    createOfficeExpense: build.mutation<OfficeExpense, OfficeExpenseBody>({
      query: (body) => ({ url: ENDPOINTS.officeExpenses.list, method: "POST", body }),
      invalidatesTags: [EXPENSES_LIST, CATEGORIES_LIST],
    }),
    updateOfficeExpense: build.mutation<OfficeExpense, { id: string; body: OfficeExpensePatch }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.officeExpenses.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "OfficeExpenses", id }, EXPENSES_LIST, CATEGORIES_LIST],
    }),
    deleteOfficeExpense: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.officeExpenses.byId(id), method: "DELETE" }),
      invalidatesTags: [EXPENSES_LIST, CATEGORIES_LIST],
    }),

    // Company-managed categories. A rename shows on the expenses too, so it refreshes the list.
    getOfficeExpenseCategories: build.query<OfficeExpenseCategory[], void>({
      query: () => ENDPOINTS.officeExpenses.categories,
      providesTags: (rows) => providesList(rows, "OfficeExpenseCategories"),
    }),
    createOfficeExpenseCategory: build.mutation<OfficeExpenseCategory, { name: string }>({
      query: (body) => ({ url: ENDPOINTS.officeExpenses.categories, method: "POST", body }),
      invalidatesTags: [CATEGORIES_LIST],
    }),
    renameOfficeExpenseCategory: build.mutation<OfficeExpenseCategory, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: ENDPOINTS.officeExpenses.categoryById(id),
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "OfficeExpenseCategories", id },
        CATEGORIES_LIST,
        EXPENSES_LIST,
      ],
    }),
    deleteOfficeExpenseCategory: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.officeExpenses.categoryById(id), method: "DELETE" }),
      invalidatesTags: [CATEGORIES_LIST, EXPENSES_LIST],
    }),
  }),
});

export const {
  useGetOfficeExpensesQuery,
  useCreateOfficeExpenseMutation,
  useUpdateOfficeExpenseMutation,
  useDeleteOfficeExpenseMutation,
  useGetOfficeExpenseCategoriesQuery,
  useCreateOfficeExpenseCategoryMutation,
  useRenameOfficeExpenseCategoryMutation,
  useDeleteOfficeExpenseCategoryMutation,
} = officeExpensesApi;
