"use client";

import { useMemo } from "react";
import { useGetSuppliersQuery } from "@/api/services/masterData.api";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import type { PaidFrom, PaymentMode, ProjectsQuery, SupplierPaymentMethod, SuppliersQuery } from "@/api/types";
import type { ComboboxOption } from "@/components/forms/ComboboxField";

export const PAYMENT_MODE_OPTIONS: Array<{ value: PaymentMode; label: string }> = [
  { value: "UDHAAR", label: "Udhaar" },
  { value: "CASH", label: "Cash now" },
  { value: "PARTIAL", label: "Part now" },
];

export const PAID_FROM_OPTIONS: Array<{ value: PaidFrom; label: string }> = [
  { value: "OFFICE_CASH", label: "Office cash" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "SITE_CASH", label: "Site cash" },
];

export const PAYMENT_METHOD_OPTIONS: Array<{ value: SupplierPaymentMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
];

export const label = <V extends string>(options: Array<{ value: V; label: string }>, value: V | null | undefined) =>
  options.find((o) => o.value === value)?.label ?? value ?? "—";

/** Active suppliers for pickers (with their udhaar when the caller can see it). */
export function useSupplierOptions(): { options: ComboboxOption[]; loading: boolean } {
  const { data, isLoading } = useGetSuppliersQuery({ isActive: "true", limit: 100 } as SuppliersQuery);
  const options = useMemo(
    () => (data?.items ?? []).map((s) => ({ value: s.id, label: s.name, description: [s.category, s.city].filter(Boolean).join(" · ") || undefined })),
    [data],
  );
  return { options, loading: isLoading };
}

/** Projects whose site can take stock (ACTIVE / CLOSEOUT) that the caller can see. */
export function useSiteProjectOptions(): { options: ComboboxOption[]; loading: boolean } {
  const { data, isLoading } = useGetProjectsQuery({ limit: 100 } as ProjectsQuery);
  const options = useMemo(
    () =>
      (data?.items ?? [])
        .filter((p) => p.status === "ACTIVE" || p.status === "CLOSEOUT")
        .map((p) => ({ value: p.id, label: p.name, description: p.code })),
    [data],
  );
  return { options, loading: isLoading };
}
