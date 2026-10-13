/**
 * The id under which a person appears in Sentry and PostHog — shared with the API and the mobile
 * app: lowercase hex SHA-256 of `"user:" + userId`, first 32 characters. Never the raw id, name,
 * phone or email.
 */
export async function hashUserId(userId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`user:${userId}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
