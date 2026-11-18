/**
 * Live updates: the API's GET /realtime/stream (Server-Sent Events) says "something in the
 * company changed" after every write by anyone, on any device; the open screens then re-read
 * their data (useLiveUpdates invalidates the RTK Query cache). Events carry no data.
 *
 * One stream per browser, not per tab: browsers allow ~6 open connections per site over
 * HTTP/1.1, so a stream in every tab would starve the normal requests. The tab holding the Web
 * Lock opens it and passes the events to the other tabs over a BroadcastChannel; when it closes,
 * another tab takes the lock and opens a new stream.
 *
 * Every request carries this tab's X-Client-Id (api/baseQuery.ts), so a tab skips the echo of its
 * own writes — its mutations already invalidated exactly the right tags.
 *
 * Reconnects: an always-on API ends a stream after ~10 minutes; a serverless one (Vercel,
 * REALTIME_MAX_STREAM_SECONDS) after a few minutes, announced by a `reconnect` event. Either way the
 * stream reopens at once. When the server numbers its messages (`id:`), the reopened stream sends
 * the last id back (Last-Event-ID) and the server replays what was missed in between — or sends
 * `resource: "*"` when it can't tell — so nothing is lost. A server without ids gets the old
 * behaviour: after a failed connection the client itself asks for a full re-read.
 */
import { API_BASE_URL, ENDPOINTS } from "@/api/endpoints";
import type { CompanyTag } from "@/api/tags";

export const CLIENT_ID_HEADER = "X-Client-Id";
const LOCK_NAME = "live-updates-stream";
const CHANNEL_NAME = "live-updates";
const RETRY_DELAYS_MS = [1_000, 3_000, 10_000, 30_000] as const;
/** The server has live updates turned off (503): try again much later. */
const DISABLED_RETRY_MS = 5 * 60_000;

/** Random id of this tab (8–64 of A–Z a–z 0–9 _ -, as the API expects). */
export const TAB_ID: string = (() => {
  const bytes = new Uint8Array(12);
  globalThis.crypto?.getRandomValues?.(bytes);
  return `w${Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("")}`.slice(0, 24);
})();

export interface ChangeEvent {
  /** API path of the write without ids ("projects/attendance/bulk"); "*" = re-read everything. */
  resource: string;
  /** X-Client-Id of the writer (null when it sent none). */
  origin: string | null;
  at: string;
}

export interface SseMessage {
  event: string;
  data: string;
  /** The stream's last event id when this message arrived (only when the server sends ids). */
  id?: string;
}

/** Incremental text/event-stream parser: feed it chunks, get complete messages back. */
export class SseParser {
  private buffer = "";
  /** Last `id:` seen, also from blocks without data (the server's pings move it on); null = none yet. */
  lastEventId: string | null = null;

  push(chunk: string): SseMessage[] {
    this.buffer += chunk.replace(/\r\n?/g, "\n");
    const out: SseMessage[] = [];
    let end: number;
    while ((end = this.buffer.indexOf("\n\n")) >= 0) {
      const block = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (!line || line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = value;
        else if (field === "data") data.push(value);
        else if (field === "id" && !value.includes("\0")) this.lastEventId = value;
      }
      if (!data.length) continue;
      const message: SseMessage = { event, data: data.join("\n") };
      if (this.lastEventId !== null) message.id = this.lastEventId;
      out.push(message);
    }
    return out;
  }
}

/** `change` message → event, or null when it isn't one. */
export function toChangeEvent(message: SseMessage): ChangeEvent | null {
  if (message.event !== "change") return null;
  try {
    const parsed = JSON.parse(message.data) as Partial<ChangeEvent>;
    if (typeof parsed.resource !== "string") return null;
    return {
      resource: parsed.resource,
      origin: typeof parsed.origin === "string" ? parsed.origin : null,
      at: typeof parsed.at === "string" ? parsed.at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export interface LiveUpdatesOptions {
  /** A change made by someone else (or "*": re-read everything). */
  onChange: (event: ChangeEvent) => void;
  /**
   * The stream got 401: refresh the login the normal way (GET /auth/me through the re-auth base
   * query) and say whether it worked. A dead session is handled there (redirect to login).
   */
  refreshSession: () => Promise<boolean>;
  fetchFn?: typeof fetch;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });

const errorCode = async (res: Response) =>
  ((await res.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;

/** Holds the stream open until `signal` aborts: reconnects, refreshes the login on 401. */
async function runStream(signal: AbortSignal, emit: (event: ChangeEvent) => void, options: LiveUpdatesOptions) {
  const fetchFn = options.fetchFn ?? fetch;
  let failures = 0;
  let missed = false;
  /** Last id of a server that numbers its messages: everything up to it was received. */
  let lastEventId: string | null = null;
  const everything = (): ChangeEvent => ({ resource: "*", origin: null, at: new Date().toISOString() });
  while (!signal.aborted) {
    let wait: number = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)];
    try {
      const resumeFrom = lastEventId;
      const res = await fetchFn(`${API_BASE_URL}${ENDPOINTS.realtime.stream}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "text/event-stream", [CLIENT_ID_HEADER]: TAB_ID, ...(resumeFrom === null ? {} : { "Last-Event-ID": resumeFrom }) },
        signal,
      });
      if (res.status === 401) {
        failures += 1;
        // Access token expired: refresh and reconnect at once (twice at most, then back off).
        if (failures <= 2 && (await options.refreshSession())) continue;
      } else if (res.status === 503 && (await errorCode(res)) === "REALTIME_DISABLED") {
        wait = DISABLED_RETRY_MS;
      } else if (res.ok && res.body) {
        failures = 0;
        // Reconnected after a failure: changes made meanwhile were never announced — unless the
        // server replays them (it got our Last-Event-ID; `ready` shows whether it numbers messages).
        let unsure = missed && resumeFrom !== null;
        if (missed && resumeFrom === null) emit(everything());
        missed = false;
        const parser = new SseParser();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let reconnect = false;
        while (!reconnect) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const message of parser.push(decoder.decode(value, { stream: true }))) {
            if (message.event === "ready") {
              if (message.id === undefined) {
                // This server does not number its messages (any more): it replays nothing.
                lastEventId = null;
                if (unsure) emit(everything());
              }
              unsure = false;
            }
            // The server's time is up (serverless): it closes now — come back at once.
            if (message.event === "reconnect") reconnect = true;
            const event = toChangeEvent(message);
            if (event) emit(event);
          }
          if (parser.lastEventId !== null) lastEventId = parser.lastEventId;
        }
        if (reconnect) await reader.cancel().catch(() => undefined);
        // Ended before `ready` said whether the server replays: still unsure on the next try.
        if (unsure) missed = true;
        // The server ends a stream after a while (~10 minutes; a few on serverless): reconnect at
        // once. With Last-Event-ID the server first replays what was announced while away.
        continue;
      } else {
        failures += 1;
      }
    } catch {
      if (signal.aborted) return;
      failures += 1;
    }
    missed = true;
    await sleep(wait, signal);
  }
}

/** Starts live updates for this tab; returns the function that stops them. */
export function startLiveUpdates(options: LiveUpdatesOptions): () => void {
  const abort = new AbortController();
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);
  const deliver = (event: ChangeEvent) => {
    if (event.origin !== TAB_ID) options.onChange(event);
  };
  if (channel) channel.onmessage = (message: MessageEvent<ChangeEvent>) => deliver(message.data);
  // The stream owner hands every event to the other tabs (a channel never echoes to its sender).
  const emit = (event: ChangeEvent) => {
    channel?.postMessage(event);
    deliver(event);
  };

  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (locks && channel) {
    locks
      .request(LOCK_NAME, { signal: abort.signal }, () => runStream(abort.signal, emit, options))
      .catch(() => undefined); // AbortError when stopped while waiting for the lock
  } else {
    void runStream(abort.signal, emit, options);
  }

  return () => {
    abort.abort();
    channel?.close();
  };
}

// ─── Which screens a change touches ─────────────────────────────────────────

type TagList = readonly CompanyTag[];
/** Totals and inboxes that most writes move — always re-read. */
const ALWAYS: TagList = ["Dashboard", "Approvals", "Notifications", "Finance", "Reports", "SyncStatus", "Control", "ControlAlerts", "Projects"];
const PROJECT: TagList = ["ProjectReview", "Floors", "ProjectEstimate", "Estimates", "OwnerShoppingList", "Schedule", "ScheduleVersions", "ScheduleDelays", "ScheduleQuotas", "Milestones", "Stoppages", "Clients"];
const SALES: TagList = ["Quotes", "Clients"];
const STOCK: TagList = ["Stock", "StockLocations", "StockCount", "Usage", "Incoming", "OwnerDelivery", "Dispatch", "Shortage", "Purchase", "PurchaseOrder", "PurchaseReturn", "Suppliers", "SupplierLedger", "SupplierPayment", "SupplierRates", "CashAccounts", "CashEntries"];
const LABOUR: TagList = ["Workers", "ProjectWorkers", "Subcontracts", "Subcontractors", "Attendance", "Measurements", "Advances", "Settlements", "SubcontractAccounts", "CashAccounts", "CashEntries"];
const CASH: TagList = ["CashAccounts", "CashEntries", "Topups", "CashCounts", "Purchase", "Stock"];
const BILLING: TagList = ["Invoices", "ClientPayments", "BillingStages", "BillingProgress", "Receivables", "BillingEvents", "ProjectTax", "Retention"];
const CLOSEOUT: TagList = ["Drawings", "Snags", "Handover", "Retention", "ChangeOrders", "SiteInstructions", "Invoices", "BillingStages"];
const EQUIPMENT: TagList = ["Equipment", "EquipmentBalances", "EquipmentMovements", "EquipmentTransfers", "EquipmentRentals", "EquipmentLosses", "EquipmentCharges", "ProjectEquipment", "ShutteringDemand", "EquipmentIdle", "SupplierLedger"];
const MASTER: TagList = ["MaterialGroups", "Materials", "QualityCategories", "PriceList", "RateHistory", "LaborRates", "WorkerTypes", "PaymentTemplates", "Suppliers", "SupplierRates", "Workers", "Subcontractors", "Rulebook", "Estimates", "ProjectEstimate"];
const TEAM: TagList = ["Users", "Invitations", "Devices", "Roles", "UserPermissions", "Me"];
const COMPANY: TagList = ["Company", "CompanySettings", "Holidays", "CompanyAudit", "TaxSettings", "ControlSettings", "Onboarding", "OpeningBalances", "Subscription", "SubscriptionPayments", "Me"];

/** First segment of the write's path (`resource`) → what it changes. Not listed = re-read everything. */
const BY_SEGMENT: Record<string, TagList> = {
  clients: SALES, quotes: [...SALES, ...PROJECT],
  floors: PROJECT, rooms: PROJECT, openings: PROJECT, estimates: PROJECT, milestones: PROJECT, stoppages: PROJECT, rulebook: [...MASTER, ...PROJECT],
  "stock-locations": STOCK, stores: STOCK, stock: STOCK, "stock-counts": STOCK, purchases: STOCK, "purchase-orders": STOCK, "purchase-returns": STOCK,
  suppliers: STOCK, "supplier-payments": STOCK, dispatches: STOCK, shortages: STOCK,
  workers: LABOUR, subcontractors: LABOUR, "project-workers": LABOUR, "subcontract-assignments": LABOUR, "work-measurements": LABOUR, settlements: LABOUR, labor: LABOUR,
  "worker-types": [...LABOUR, ...MASTER], "labor-rates": [...LABOUR, ...MASTER],
  "cash-accounts": CASH, "cash-counts": CASH, "cash-expenses": CASH, "cash-floats": CASH, "cash-handovers": CASH, "topup-requests": CASH,
  invoices: BILLING, payments: BILLING, "billing-stages": BILLING, "billing-progress": BILLING, "billing-events": BILLING, receivables: BILLING,
  drawings: CLOSEOUT, "drawing-revisions": CLOSEOUT, snags: CLOSEOUT, "change-orders": CLOSEOUT, "site-instructions": CLOSEOUT,
  equipment: EQUIPMENT, "daily-logs": ["DailyLogs"],
  "material-groups": MASTER, materials: MASTER, "quality-categories": MASTER, "price-list": MASTER, "payment-templates": MASTER,
  users: TEAM, invitations: TEAM, devices: TEAM, roles: TEAM, permissions: TEAM,
  company: COMPANY, tax: [...COMPANY, ...BILLING], control: COMPANY, onboarding: COMPANY, "opening-balances": [...COMPANY, ...STOCK, ...CASH], subscription: COMPANY,
};
/** `projects/<part>/…` → what that part of the project changes; any other part (wizard, status, team) = the project itself. */
const PROJECT_PART: Record<string, TagList> = {
  stock: STOCK, "material-usage": STOCK, incoming: STOCK, "owner-deliveries": STOCK,
  labor: LABOUR, attendance: LABOUR, advances: LABOUR, settlements: LABOUR, workers: LABOUR,
  cashbook: CASH,
  "billing-stages": BILLING, invoices: BILLING, payments: BILLING, receivables: BILLING, billing: BILLING, tax: BILLING,
  "daily-logs": ["DailyLogs"],
  drawings: CLOSEOUT, snags: CLOSEOUT, handover: CLOSEOUT, retention: CLOSEOUT, "change-orders": CLOSEOUT, "site-instructions": CLOSEOUT,
  equipment: EQUIPMENT,
};

/**
 * The cache tags a change in `resource` (the write's path without ids) can touch, or "ALL" when it is not
 * known (sync pushes, approvals in bulk, imports, "*" after a lost connection) — re-reading everything is
 * always safe, just slower. Fewer tags = only the screens that changed refetch, so they come back sooner.
 */
export function tagsForResource(resource: string): CompanyTag[] | "ALL" {
  const [first, second] = resource.split("/");
  if (!first || resource === "*") return "ALL";
  const part = first === "projects" ? (second && PROJECT_PART[second]) || PROJECT : BY_SEGMENT[first];
  return part ? [...new Set([...ALWAYS, ...part])] : "ALL";
}
