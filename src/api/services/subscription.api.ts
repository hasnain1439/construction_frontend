import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  ChangePlanBody,
  Paginated,
  PaymentsQuery,
  PlanChange,
  PlanOption,
  SubmitPaymentBody,
  SubscriptionDetail,
  SubscriptionPayment,
} from "@/api/types";

export const subscriptionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSubscription: build.query<SubscriptionDetail, void>({
      query: () => ENDPOINTS.subscription.current,
      providesTags: ["Subscription"],
    }),
    getPlans: build.query<PlanOption[], void>({
      query: () => ENDPOINTS.subscription.plans,
      providesTags: ["SubscriptionPlans"],
    }),
    getPayments: build.query<Paginated<SubscriptionPayment>, PaymentsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.subscription.payments, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<SubscriptionPayment>(data, meta),
      providesTags: (page) => providesList(page?.items, "SubscriptionPayments"),
    }),
    submitPayment: build.mutation<SubscriptionPayment, SubmitPaymentBody>({
      query: (body) => ({ url: ENDPOINTS.subscription.payments, method: "POST", body }),
      invalidatesTags: [{ type: "SubscriptionPayments", id: LIST }, "Subscription"],
    }),
    changePlan: build.mutation<PlanChange, ChangePlanBody>({
      query: (body) => ({ url: ENDPOINTS.subscription.changePlan, method: "POST", body }),
      invalidatesTags: ["Subscription", "SubscriptionPlans"],
    }),
    cancelPlanChange: build.mutation<{ cancelled: true }, void>({
      query: () => ({ url: ENDPOINTS.subscription.changePlan, method: "DELETE" }),
      invalidatesTags: ["Subscription", "SubscriptionPlans"],
    }),
  }),
});

export const {
  useGetSubscriptionQuery,
  useGetPlansQuery,
  useGetPaymentsQuery,
  useSubmitPaymentMutation,
  useChangePlanMutation,
  useCancelPlanChangeMutation,
} = subscriptionApi;
