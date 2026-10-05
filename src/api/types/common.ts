import type { components, paths } from "@/api/generated/schema";

/** Component schemas generated from the backend's OpenAPI document. */
export type Schemas = components["schemas"];

type FullPath = keyof paths;
type Method = "get" | "post" | "put" | "patch" | "delete";

/** JSON request body of an operation, e.g. `RequestBody<"/api/v1/auth/login", "post">`. */
export type RequestBody<P extends FullPath, M extends Method & keyof paths[P]> = paths[P][M] extends {
  requestBody?: { content: { "application/json": infer B } };
}
  ? B
  : never;

/** Query parameters of an operation. */
export type QueryParams<P extends FullPath, M extends Method & keyof paths[P]> = paths[P][M] extends {
  parameters: { query?: infer Q };
}
  ? NonNullable<Q>
  : never;

/** `data` of a 200/201 response, when the backend documents a schema for it. */
export type ResponseData<P extends FullPath, M extends Method & keyof paths[P]> = paths[P][M] extends {
  responses: { 200: { content: { "application/json": { data: infer D } } } };
}
  ? D
  : paths[P][M] extends { responses: { 201: { content: { "application/json": { data: infer D } } } } }
    ? D
    : never;

// ─── Envelope ───────────────────────────────────────────────────────────────

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated list: items + the backend's `meta` (may carry extras such as `usage`). */
export interface Paginated<T, M extends object = object> {
  items: T[];
  meta: PageMeta & M;
}

export interface PageQuery {
  page?: number;
  limit?: number;
}

/** Normalised error every RTK Query hook rejects with. */
export interface ApiError {
  /** HTTP status, or 0 for network failures. */
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface FieldIssue {
  field: string;
  message: string;
}

export type Id = string;
/** Money is paisa as a string (BigInt-safe). */
export type Paisa = string;
/** Calendar date "YYYY-MM-DD". */
export type IsoDate = string;
/** ISO timestamp (UTC). */
export type IsoDateTime = string;

export interface NamedRef {
  id: Id;
  name: string;
}
