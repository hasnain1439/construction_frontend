import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type {
  AcceptInvitationBody,
  AuthResult,
  ForgotPasswordBody,
  ForgotPasswordResult,
  InvitationPreview,
  LoggedOut,
  LoginBody,
  LogoutAllResult,
  Me,
  OtpRequestBody,
  OtpRequestResult,
  OtpVerifyBody,
  RefreshResult,
  ResetPasswordBody,
  ResetPasswordResult,
  Session,
  SignupBody,
  UpdateMeBody,
  UpdatePreferencesBody,
} from "@/api/types";

const web = <T extends object>(body: T) => ({ ...body, client: "web" as const });

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResult, Omit<LoginBody, "client" | "device">>({
      query: (body) => ({ url: ENDPOINTS.auth.login, method: "POST", body: web(body) }),
      invalidatesTags: ["Me"],
    }),
    signup: build.mutation<AuthResult, Omit<SignupBody, "client" | "device">>({
      query: (body) => ({ url: ENDPOINTS.auth.signup, method: "POST", body: web(body) }),
      invalidatesTags: ["Me"],
    }),
    requestOtp: build.mutation<OtpRequestResult, OtpRequestBody>({
      query: (body) => ({ url: ENDPOINTS.auth.otpRequest, method: "POST", body }),
    }),
    verifyOtp: build.mutation<AuthResult, Omit<OtpVerifyBody, "client" | "device">>({
      query: (body) => ({ url: ENDPOINTS.auth.otpVerify, method: "POST", body: web(body) }),
      invalidatesTags: ["Me"],
    }),
    /** Silent session check used by the login page (refresh cookie still valid?). */
    refreshSession: build.mutation<RefreshResult, void>({
      query: () => ({ url: ENDPOINTS.auth.refresh, method: "POST", body: { client: "web" } }),
    }),
    forgotPassword: build.mutation<ForgotPasswordResult, ForgotPasswordBody>({
      query: (body) => ({ url: ENDPOINTS.auth.passwordForgot, method: "POST", body }),
    }),
    resetPassword: build.mutation<ResetPasswordResult, ResetPasswordBody>({
      query: (body) => ({ url: ENDPOINTS.auth.passwordReset, method: "POST", body }),
    }),
    acceptInvitation: build.mutation<
      AuthResult,
      { token: string; body: Omit<AcceptInvitationBody, "client" | "device"> }
    >({
      query: ({ token, body }) => ({ url: ENDPOINTS.auth.acceptInvitation(token), method: "POST", body: web(body) }),
      invalidatesTags: ["Me"],
    }),
    /** Public: who invited this person and as what (no cache sharing between tokens). */
    getInvitationPreview: build.query<InvitationPreview, string>({
      query: (token) => ENDPOINTS.auth.invitationPreview(token),
    }),
    getMe: build.query<Me, void>({
      query: () => ENDPOINTS.auth.me,
      providesTags: ["Me"],
    }),
    /** Saves the UI language on the account (404 on APIs without it — callers ignore that). */
    updatePreferences: build.mutation<unknown, UpdatePreferencesBody>({
      query: (body) => ({ url: ENDPOINTS.auth.mePreferences, method: "PATCH", body }),
    }),
    updateMe: build.mutation<Me, UpdateMeBody>({
      query: (body) => ({ url: ENDPOINTS.auth.me, method: "PATCH", body }),
      invalidatesTags: ["Me", "Sessions"],
    }),
    getSessions: build.query<Session[], void>({
      query: () => ENDPOINTS.auth.sessions,
      providesTags: ["Sessions"],
    }),
    logout: build.mutation<LoggedOut, void>({
      query: () => ({ url: ENDPOINTS.auth.logout, method: "POST" }),
    }),
    logoutAll: build.mutation<LogoutAllResult, void>({
      query: () => ({ url: ENDPOINTS.auth.logoutAll, method: "POST" }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useRefreshSessionMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useAcceptInvitationMutation,
  useGetInvitationPreviewQuery,
  useGetMeQuery,
  useUpdateMeMutation,
  useUpdatePreferencesMutation,
  useGetSessionsQuery,
  useLogoutMutation,
  useLogoutAllMutation,
} = authApi;
