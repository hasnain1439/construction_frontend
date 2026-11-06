import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncBadge } from "@/components/layout/StickyFooter";
import { renderWithStore } from "../render";

const api = vi.hoisted(() => ({ data: undefined as unknown, calls: [] as unknown[] }));
vi.mock("@/api/services/edge.api", () => ({
  useGetOfficeSyncStatusQuery: (_arg: unknown, options: unknown) => {
    api.calls.push(options);
    return { data: api.data };
  },
}));

const NOW = new Date("2026-11-06T12:00:00.000Z");
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();
const office = (state: string | null, lastSyncAt: string | null, pending = 0) => ({ officeMode: true, state, lastSyncAt, pending });
const text = (data: unknown) => {
  api.data = data;
  const { unmount } = renderWithStore(<SyncBadge />);
  const value = screen.getByTestId("sync-badge").textContent;
  unmount();
  return value;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  api.calls = [];
});

describe("sync badge", () => {
  it("in the cloud it stays plain and does not poll", () => {
    expect(text({ officeMode: false, state: null, lastSyncAt: null, pending: 0 })).toBe("All synced");
    expect(api.calls.at(-1)).toEqual({ skip: true, pollingInterval: 0 });
  });

  it("on an office PC it polls and shows the last sync", () => {
    expect(text(office("ok", minutesAgo(0)))).toBe("All synced · just now");
    expect(api.calls.at(-1)).toEqual({ skip: false, pollingInterval: 30_000 });
    expect(text(office("ok", minutesAgo(5)))).toBe("All synced · 5 min ago");
    expect(text(office("ok", minutesAgo(180)))).toBe("All synced · 3 h ago");
    expect(text(office("ok", minutesAgo(3 * 24 * 60)))).toBe("All synced · 3 days ago");
  });

  it("never says all synced when it isn't", () => {
    expect(text(office("offline", minutesAgo(90)))).toBe("Offline · last sync 1 h ago");
    expect(text(office("ok", minutesAgo(1), 2))).toBe("2 waiting to sync · last sync 1 min ago");
    expect(text(office("login-failed", null))).toBe("Sync problem · last sync never");
    expect(text(office("waiting-approval", null))).toBe("Sync problem · last sync never");
    expect(text(office("copying", null))).toBe("Syncing…");
    expect(text(office(null, null))).toBe("Syncing…");
  });
});
