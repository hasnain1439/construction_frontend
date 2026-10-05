"use client";

import { useAppSelector, useMe } from "@/store/hooks";

/** True while the company is READ_ONLY (lapsed subscription) — writes are refused. */
export function useReadOnly(): boolean {
  const me = useMe();
  const hit = useAppSelector((state) => state.ui.readOnlyHit);
  return Boolean(me?.tenant.readOnly || hit);
}
