import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import type { Me } from "@/api/types";
import { makeStore } from "@/store";
import { initialUiState, type UiState } from "@/store/slices/uiSlice";

/** Renders inside a real store, optionally signed in as `me`. */
export function renderWithStore(
  ui: ReactElement,
  { me = null, ui: uiOverrides, ...options }: { me?: Me | null; ui?: Partial<UiState> } & Omit<RenderOptions, "wrapper"> = {},
) {
  const store = makeStore({
    auth: { me, status: me ? "authenticated" : "unknown" },
    ui: { ...initialUiState, ...uiOverrides },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
