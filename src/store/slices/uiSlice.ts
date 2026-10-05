import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemePreference = "light" | "dark" | "system";
export type UiLanguage = "en" | "roman-ur";

export interface PlanLimitInfo {
  resource?: string;
  limit?: number | null;
  used?: number;
}

/** Client-only UI state. Never holds server data. */
export interface UiState {
  railCollapsed: boolean;
  /** Rail item whose flyout is open, or null. */
  flyoutFor: string | null;
  commandOpen: boolean;
  theme: ThemePreference;
  language: UiLanguage;
  /** Set when the API answers 402 PLAN_LIMIT_REACHED; drives PlanLimitDialog. */
  planLimit: PlanLimitInfo | null;
  /** Set when a write is refused with 403 ACCOUNT_READ_ONLY. */
  readOnlyHit: boolean;
}

export const initialUiState: UiState = {
  railCollapsed: false,
  flyoutFor: null,
  commandOpen: false,
  theme: "system",
  language: "en",
  planLimit: null,
  readOnlyHit: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState: initialUiState,
  reducers: {
    hydrateUi(state, action: PayloadAction<Partial<Pick<UiState, "railCollapsed" | "language" | "theme">>>) {
      Object.assign(state, action.payload);
    },
    toggleRail(state) {
      state.railCollapsed = !state.railCollapsed;
    },
    openFlyout(state, action: PayloadAction<string>) {
      state.flyoutFor = action.payload;
    },
    toggleFlyout(state, action: PayloadAction<string>) {
      state.flyoutFor = state.flyoutFor === action.payload ? null : action.payload;
    },
    closeFlyout(state) {
      state.flyoutFor = null;
    },
    setCommandOpen(state, action: PayloadAction<boolean>) {
      state.commandOpen = action.payload;
      if (action.payload) state.flyoutFor = null;
    },
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
    setLanguage(state, action: PayloadAction<UiLanguage>) {
      state.language = action.payload;
    },
    showPlanLimit(state, action: PayloadAction<PlanLimitInfo>) {
      state.planLimit = action.payload;
    },
    hidePlanLimit(state) {
      state.planLimit = null;
    },
    markReadOnlyHit(state) {
      state.readOnlyHit = true;
    },
  },
});

export const {
  hydrateUi,
  toggleRail,
  openFlyout,
  toggleFlyout,
  closeFlyout,
  setCommandOpen,
  setTheme,
  setLanguage,
  showPlanLimit,
  hidePlanLimit,
  markReadOnlyHit,
} = uiSlice.actions;

export default uiSlice.reducer;
