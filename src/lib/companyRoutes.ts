/**
 * Company data in the super admin console: /admin/data/<company path> shows the company
 * app's own page for <company path> (see companyRoutes.generated.ts). This file only matches
 * a path to a page — like Next.js does: static segments beat [params], which beat [...rest].
 */
import type { ComponentType } from "react";

export type CompanyPageComponent = ComponentType<{
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export type RouteSegment = { kind: "static" | "param" | "catchAll"; name: string };

export interface CompanyRoute {
  segments: RouteSegment[];
  /** The page module; each page types its own params, the matcher supplies them. */
  load: () => Promise<{ default: unknown }>;
}

export interface RouteMatch {
  route: CompanyRoute;
  params: Record<string, string | string[]>;
}

const SCORE = { static: 3, param: 2, catchAll: 1 } as const;

function matchOne(
  route: CompanyRoute,
  parts: string[],
): { params: Record<string, string | string[]>; score: number[] } | null {
  const params: Record<string, string | string[]> = {};
  const score: number[] = [];
  for (let i = 0; i < route.segments.length; i++) {
    const seg = route.segments[i]!;
    if (seg.kind === "catchAll") {
      const rest = parts.slice(i);
      if (!rest.length) return null; // [...rest] needs at least one segment
      params[seg.name] = rest;
      score.push(SCORE.catchAll);
      return { params, score };
    }
    const part = parts[i];
    if (part === undefined) return null;
    if (seg.kind === "static" && seg.name !== part) return null;
    if (seg.kind === "param") params[seg.name] = part;
    score.push(SCORE[seg.kind]);
  }
  return route.segments.length === parts.length ? { params, score } : null;
}

const better = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
};

/** The company page for `parts` (already URL-decoded path segments), or null. */
export function matchCompanyRoute(routes: CompanyRoute[], parts: string[]): RouteMatch | null {
  let best: { route: CompanyRoute; params: Record<string, string | string[]>; score: number[] } | null = null;
  for (const route of routes) {
    const m = matchOne(route, parts);
    if (m && (!best || better(m.score, best.score))) best = { route, ...m };
  }
  return best ? { route: best.route, params: best.params } : null;
}

/** "/suppliers-stock/purchases/1" → "/admin/data/suppliers-stock/purchases/1" */
export const DATA_BASE = "/admin/data";
export const toAdminDataPath = (companyPath: string) =>
  `${DATA_BASE}${companyPath.startsWith("/") ? companyPath : `/${companyPath}`}`;
