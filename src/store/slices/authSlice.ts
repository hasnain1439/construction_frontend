import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import { authApi } from "@/api/services/auth.api";
import type { AuthResult, Me } from "@/api/types";
import { loggedOut, sessionExpired } from "@/store/sessionEvents";

/**
 * Snapshot of `/auth/me` for synchronous permission checks (rail, guards). The server
 * remains the source of truth: the snapshot is only ever written from API responses.
 */
export interface AuthState {
  me: Me | null;
  status: "unknown" | "authenticated" | "signedOut";
}

const initialState: AuthState = { me: null, status: "unknown" };

const fromAuthResult = (result: AuthResult): Me => ({
  user: result.user,
  tenant: result.tenant,
  subscription: result.subscription,
  permissions: result.permissions,
  assignedProjectIds: [],
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(sessionExpired, (state, action) => {
        if (action.payload.audience === "company") return { me: null, status: "signedOut" };
        return state;
      })
      .addCase(loggedOut, (state, action) => {
        if (action.payload.audience === "company") return { me: null, status: "signedOut" };
        return state;
      })
      .addMatcher(
        isAnyOf(authApi.endpoints.getMe.matchFulfilled, authApi.endpoints.updateMe.matchFulfilled),
        (state, action) => {
          state.me = action.payload;
          state.status = "authenticated";
        },
      )
      .addMatcher(
        isAnyOf(
          authApi.endpoints.login.matchFulfilled,
          authApi.endpoints.signup.matchFulfilled,
          authApi.endpoints.verifyOtp.matchFulfilled,
          authApi.endpoints.acceptInvitation.matchFulfilled,
        ),
        (state, action) => {
          state.me = fromAuthResult(action.payload);
          state.status = "authenticated";
        },
      )
      .addMatcher(authApi.endpoints.getMe.matchRejected, (state, action) => {
        if (action.payload?.status === 401) return { me: null, status: "signedOut" };
        return state;
      });
  },
});

export default authSlice.reducer;
