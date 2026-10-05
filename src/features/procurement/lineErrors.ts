import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { errorCode, isApiError } from "@/lib/apiErrors";

/**
 * Puts a line-level API error (INSUFFICIENT_STOCK, SHORTAGE_NOTE_REQUIRED, RATE_REQUIRED …)
 * onto the matching row of a LineItemsEditor. Returns true when it found a row.
 */
export function applyLineError<T extends FieldValues>(
  error: unknown,
  rows: Array<{ materialId: string | null }>,
  setError: UseFormSetError<T>,
  arrayName: string,
  fieldByCode: Record<string, string>,
): boolean {
  const code = errorCode(error);
  if (!code || !isApiError(error) || !(code in fieldByCode)) return false;
  const details = (error.details ?? {}) as { materialId?: string; materialIds?: string[]; items?: Array<{ materialId: string; available: number; unit?: string }> };
  const ids = details.items?.map((i) => i.materialId) ?? details.materialIds ?? (details.materialId ? [details.materialId] : []);
  let applied = false;
  for (const materialId of ids) {
    const index = rows.findIndex((r) => r.materialId === materialId);
    if (index === -1) continue;
    const item = details.items?.find((i) => i.materialId === materialId);
    const message = item ? `Only ${item.available} ${item.unit ?? ""} available`.replace(/\s+$/, "") : error.message;
    setError(`${arrayName}.${index}.${fieldByCode[code]}` as Path<T>, { type: "server", message }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}
