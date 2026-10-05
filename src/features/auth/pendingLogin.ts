import type { CompanyChoice } from "@/api/types";

/**
 * Credentials waiting for a company choice after 409 MULTIPLE_COMPANIES. Kept in module
 * memory only — never in Redux, storage or the URL — and cleared once used. A page reload
 * loses it, which simply sends the person back to the login form.
 */
export type PendingLogin =
  | { kind: "password"; login: string; password: string; companies: CompanyChoice[]; next?: string }
  | { kind: "otp"; phone: string; code: string; companies: CompanyChoice[]; next?: string };

let pending: PendingLogin | null = null;

export function setPendingLogin(value: PendingLogin): void {
  pending = value;
}

export function getPendingLogin(): PendingLogin | null {
  return pending;
}

export function clearPendingLogin(): void {
  pending = null;
}
