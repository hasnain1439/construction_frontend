import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/services/auth.api";
import { useChangeLanguage } from "@/features/auth/hooks/useChangeLanguage";
import { preferenceSyncDisabled, resetPreferenceSync } from "@/lib/languagePreference";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

function Picker() {
  const change = useChangeLanguage();
  return (
    <button type="button" onClick={() => change("ur")}>
      urdu
    </button>
  );
}

/** Replaces the PATCH /auth/me/preferences call; `result` resolves or rejects like `.unwrap()`. */
function stubPreferences(result: () => Promise<unknown>) {
  return vi.spyOn(authApi.endpoints.updatePreferences, "initiate").mockImplementation((() => () => ({ unwrap: result })) as never);
}

afterEach(() => {
  window.localStorage.clear();
  resetPreferenceSync();
});

describe("language preference sync", () => {
  it("switches the UI, remembers the choice and saves it on the account", async () => {
    const spy = stubPreferences(() => Promise.resolve({}));
    const { store } = renderWithStore(<Picker />, { me: meFixture("THEKEDAR") });
    fireEvent.click(screen.getByRole("button", { name: "urdu" }));
    expect(store.getState().ui.language).toBe("ur");
    expect(window.localStorage.getItem("cw.languageChosen")).toBe("1");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ language: "ur" });
  });

  it("does not call the API when signed out", () => {
    const spy = stubPreferences(() => Promise.resolve({}));
    const { store } = renderWithStore(<Picker />);
    fireEvent.click(screen.getByRole("button", { name: "urdu" }));
    expect(store.getState().ui.language).toBe("ur");
    expect(spy).not.toHaveBeenCalled();
  });

  it("an API without the endpoint (404) is not called again and nothing breaks", async () => {
    const spy = stubPreferences(() => Promise.reject({ status: 404, data: { error: { code: "NOT_FOUND" } } }));
    const { store } = renderWithStore(<Picker />, { me: meFixture("THEKEDAR") });
    fireEvent.click(screen.getByRole("button", { name: "urdu" }));
    await waitFor(() => expect(preferenceSyncDisabled()).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "urdu" }));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.getState().ui.language).toBe("ur");
  });
});
