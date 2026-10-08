"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { adminBaseApi } from "@/api/adminBaseApi";
import { baseApi } from "@/api/baseApi";
import { clearActingTenant } from "@/lib/actingCompany";
import { useAdminLogoutMutation } from "@/api/services/admin/auth.api";
import { useLogoutAllMutation, useLogoutMutation } from "@/api/services/auth.api";
import { useAppDispatch } from "@/store/hooks";
import { loggedOut } from "@/store/sessionEvents";

/** Signs out (this device, or everywhere), clears cached data and goes to the login page. */
export function useLogout() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logout, { isLoading }] = useLogoutMutation();
  const [logoutAll, { isLoading: isLoadingAll }] = useLogoutAllMutation();

  const finish = useCallback(() => {
    dispatch(loggedOut({ audience: "company" }));
    dispatch(baseApi.util.resetApiState());
    router.replace("/login");
  }, [dispatch, router]);

  const signOut = useCallback(async () => {
    try {
      await logout().unwrap();
    } finally {
      // Even if the server call fails (expired session), leave the app signed out.
      finish();
    }
  }, [logout, finish]);

  const signOutEverywhere = useCallback(async () => {
    await logoutAll().unwrap();
    finish();
  }, [logoutAll, finish]);

  return { signOut, signOutEverywhere, isLoading: isLoading || isLoadingAll };
}

export function useAdminLogout() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logout, { isLoading }] = useAdminLogoutMutation();
  const signOut = useCallback(async () => {
    try {
      await logout().unwrap();
    } finally {
      dispatch(loggedOut({ audience: "platform" }));
      dispatch(adminBaseApi.util.resetApiState());
      // Leave any company the admin was working in (Company data) and drop its cached data.
      clearActingTenant();
      dispatch(baseApi.util.resetApiState());
      router.replace("/admin/login");
    }
  }, [logout, dispatch, router]);
  return { signOut, isLoading };
}
