"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/useT";
import { applyFieldErrors, errorCode, getErrorMessage } from "@/lib/apiErrors";

type SetError = Parameters<typeof applyFieldErrors>[1];

/**
 * Runs a mutation with the app's feedback rules: success toast, field errors onto the
 * form when possible, otherwise an error toast. PLAN_LIMIT_REACHED / ACCOUNT_READ_ONLY are
 * also handled globally (dialog / banner). Resolves to the result, or undefined on error.
 */
export function useMutationToast() {
  const language = useLanguage();
  return useCallback(
    async <T>(
      run: () => Promise<T>,
      options: {
        success?: string | ((result: T) => string);
        setError?: SetError;
        fieldMap?: Record<string, string>;
        codeFields?: Record<string, string>;
        /** Called with the error code; return true when handled. */
        onError?: (code: string | null, error: unknown) => boolean | void;
      } = {},
    ): Promise<T | undefined> => {
      try {
        const result = await run();
        if (options.success) toast.success(typeof options.success === "function" ? options.success(result) : options.success);
        return result;
      } catch (error) {
        if (options.onError?.(errorCode(error), error)) return undefined;
        const code = errorCode(error);
        // The global dialog explains plan limits; don't double up with a toast.
        if (code === "PLAN_LIMIT_REACHED") return undefined;
        const applied = options.setError
          ? applyFieldErrors(error, options.setError, { language, fieldMap: options.fieldMap, codeFields: options.codeFields })
          : false;
        if (!applied) toast.error(getErrorMessage(error, language));
        return undefined;
      }
    },
    [language],
  );
}
