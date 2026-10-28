/** Helpers for the offline office page (kept apart from the view so they are easy to test). */

export interface FieldChange {
  field: string;
  office: unknown;
  cloud: unknown;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The fields whose value differs between the office copy and the cloud copy of a row, in a
 * stable order (fields of the office row first). A missing row counts as "no value" per field.
 */
export function changedFields(
  officeRow: Record<string, unknown> | null,
  cloudRow: Record<string, unknown> | null,
): FieldChange[] {
  const office = officeRow ?? {};
  const cloud = cloudRow ?? {};
  const fields = [...new Set([...Object.keys(office), ...Object.keys(cloud)])];
  return fields
    .filter((field) => !same(office[field], cloud[field]))
    .map((field) => ({ field, office: office[field], cloud: cloud[field] }));
}

/** A primary key as "id: 0199…" (several columns joined with " · "). */
export function describePk(pk: Record<string, unknown> | null | undefined): string {
  return Object.entries(pk ?? {})
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)}`,
    )
    .join(" · ");
}
