"use client";

import { useMemo } from "react";
import { useGetSuppliersQuery } from "@/api/services/masterData.api";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import type { PaidFrom, PaymentMode, ProjectsQuery, SupplierPaymentMethod, SuppliersQuery } from "@/api/types";
import type { ComboboxOption } from "@/components/forms/ComboboxField";
import { useEnumT } from "@/i18n/useT";

const PAYMENT_MODES: PaymentMode[] = ["UDHAAR", "CASH", "PARTIAL"];
const PAID_FROM: PaidFrom[] = ["OFFICE_CASH", "BANK", "CHEQUE", "JAZZCASH", "EASYPAISA", "SITE_CASH"];
const PAYMENT_METHODS: SupplierPaymentMethod[] = ["CASH", "BANK", "CHEQUE", "JAZZCASH", "EASYPAISA"];

/** Udhaar / Cash now / Part now, in the current language. */
export function usePaymentModeOptions(): Array<{ value: PaymentMode; label: string }> {
  const te = useEnumT();
  return PAYMENT_MODES.map((value) => ({ value, label: te("procPaymentMode", value) }));
}

/** Where a purchase was paid from, in the current language. */
export function usePaidFromOptions(): Array<{ value: PaidFrom; label: string }> {
  const te = useEnumT();
  return PAID_FROM.map((value) => ({ value, label: te("procPaidFrom", value) }));
}

/** How a supplier was paid, in the current language. */
export function usePaymentMethodOptions(): Array<{ value: SupplierPaymentMethod; label: string }> {
  const te = useEnumT();
  return PAYMENT_METHODS.map((value) => ({ value, label: te("procPaymentMethod", value) }));
}

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
