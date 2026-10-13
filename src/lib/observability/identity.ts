/**
 * Who errors and events belong to — without saying who that is: the hashed user id
 * (`hashUserId`) and the tenant id. Names, phones and emails are never passed on.
 */
import * as Sentry from "@sentry/nextjs";
import { identifyAnalytics, resetAnalytics, track } from "./analytics";
import { hashUserId } from "./hash";

export interface ObservedIdentity {
  userId: string;
  tenantId?: string | null;
}

export type LoginMethod = "password" | "otp" | "signup" | "invite";

/** Sets the Sentry user ({ id: hash } only) + tenantId tag and the PostHog person + company group. */
export async function observeSignedIn({ userId, tenantId }: ObservedIdentity): Promise<void> {
  try {
    const id = await hashUserId(userId);
    Sentry.setUser({ id });
    Sentry.setTag("tenantId", tenantId ?? undefined);
    await identifyAnalytics(id, tenantId);
  } catch {
    // Observability must never break the app.
  }
}

/** Right after a successful sign-in: identify, then send `login`. */
export async function trackLogin(identity: ObservedIdentity & { role?: string }, method: LoginMethod): Promise<void> {
  await observeSignedIn(identity);
  await track("login", { client: "web", method, role: identity.role });
}

/** On sign-out: forget the person in Sentry and PostHog. */
export function observeSignedOut(): void {
  Sentry.setUser(null);
  Sentry.setTag("tenantId", undefined);
  void resetAnalytics().catch(() => undefined);
}
