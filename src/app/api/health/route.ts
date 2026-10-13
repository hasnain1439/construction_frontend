/**
 * Liveness probe for the Docker HEALTHCHECK / Caddy / uptime monitors: answers without
 * touching the API or cookies. (`/api/v1/*` is proxied to the API; `/api/health` is not.)
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
