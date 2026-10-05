"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { authApi } from "@/api/services/auth.api";
import { safeNext } from "@/lib/session";
import { useAppDispatch } from "@/store/hooks";

/** After sign-in: load /auth/me, then go to `?next=` or the dashboard. */
export function useAfterLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  return useCallback(
    async (nextOverride?: string) => {
      await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }));
      router.replace(safeNext(nextOverride ?? searchParams.get("next"), "/dashboard"));
    },
    [dispatch, router, searchParams],
  );
}
