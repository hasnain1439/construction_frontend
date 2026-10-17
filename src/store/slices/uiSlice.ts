import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemePreference = "light" | "dark" | "system";
/** English, Roman Urdu (Latin script) and Urdu (Nastaliq script, right-to-left). */
export type UiLanguage = "en" | "roman-ur" | "ur";

/**
 * Any stored or server spelling of a language → a UI language (QA-B-18: an older build or the
 * server code left `language: "roman"` in localStorage and every translated page crashed).
 * Unknown values give `fallback`.
 */
export function normalizeUiLanguage(value: unknown, fallback: UiLanguage = "en"): UiLanguage {
  switch (value) {
    case "en":
    case "ENGLISH":
      return "en";
    case "roman-ur":
    case "roman":
    case "ur-Latn":
    case "ROMAN_URDU":
      return "roman-ur";
    case "ur":
    case "URDU":
      return "ur";
    default:
      return fallback;
  }
}

export interface PlanLimitInfo {
  resource?: string;
  limit?: number | null;
  used?: number;
}

/** Client-only UI state. Never holds server data. */
export interface UiState {
  railCollapsed: boolean;
  /** Phones/tablets: the rail opens as a drawer over the page (not persisted). */
  mobileNavOpen: boolean;
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
  mobileNavOpen: false,
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
      const { railCollapsed, language, theme } = action.payload;
      if (typeof railCollapsed === "boolean") state.railCollapsed = railCollapsed;
      if (language !== undefined) state.language = normalizeUiLanguage(language, state.language);
      if (theme === "light" || theme === "dark" || theme === "system") state.theme = theme;
    },
    toggleRail(state) {
      state.railCollapsed = !state.railCollapsed;
    },
    setMobileNav(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
      if (!action.payload) state.flyoutFor = null;
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
      state.language = normalizeUiLanguage(action.payload, state.language);
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
  setMobileNav,
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
