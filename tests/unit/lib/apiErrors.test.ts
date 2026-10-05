import { describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/api/types";
import {
  applyFieldErrors,
  companyChoices,
  getErrorMessage,
  isApiError,
  lockedMinutes,
  planLimitDetails,
} from "@/lib/apiErrors";

const err = (code: string, details?: unknown, status = 400, message = "backend message"): ApiError => ({
  status,
  code,
  message,
  details,
});

describe("getErrorMessage", () => {
  it("maps known codes to friendly English and Roman Urdu", () => {
    expect(getErrorMessage(err("INVALID_CREDENTIALS", undefined, 401))).toBe("Wrong phone/email or password.");
    expect(getErrorMessage(err("INVALID_CREDENTIALS", undefined, 401), "roman-ur")).toBe(
      "Phone/email ya password ghalat hai.",
    );
    expect(getErrorMessage(err("MATERIAL_IN_USE", undefined, 409))).toBe(
      "Used in estimates and stock. You can hide it instead.",
    );
  });

  it("falls back to the backend message for unknown codes", () => {
    expect(getErrorMessage(err("SOMETHING_NEW", undefined, 400, "Brand new rule"))).toBe("Brand new rule");
  });

  it("shows the retry time for a locked account", () => {
    const locked = err("ACCOUNT_LOCKED", { retryAfterSeconds: 840 }, 423);
    expect(getErrorMessage(locked)).toBe("Too many wrong passwords. Try again in 14 minutes.");
    expect(lockedMinutes(locked)).toBe(14);
    expect(getErrorMessage(err("ACCOUNT_LOCKED", { retryAfterSeconds: 30 }, 423))).toContain("1 minute.");
  });

  it("explains a payment schedule that isn't 100%", () => {
    expect(getErrorMessage(err("PERCENT_TOTAL_INVALID", { total: 95 }))).toBe("95% — must be 100%.");
  });

  it("handles non-API errors", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage(undefined)).toBe("Something went wrong on our side. Please try again.");
    expect(isApiError({ code: "X", status: 400 })).toBe(true);
    expect(isApiError("nope")).toBe(false);
  });
});

describe("applyFieldErrors", () => {
  it("puts VALIDATION_ERROR fields on the form", () => {
    const setError = vi.fn();
    const applied = applyFieldErrors(
      err("VALIDATION_ERROR", {
        fields: [
          { field: "phone", message: "Enter a valid Pakistani mobile number" },
          { field: "login", message: "Required" },
          { field: "(root)", message: "Nothing to update" },
        ],
      }),
      setError,
      { fieldMap: { login: "identifier" } },
    );
    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenNthCalledWith(
      1,
      "phone",
      { type: "server", message: "Enter a valid Pakistani mobile number" },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(2, "identifier", { type: "server", message: "Required" }, { shouldFocus: false });
  });

  it("routes a whole error code to one field", () => {
    const setError = vi.fn();
    expect(applyFieldErrors(err("PHONE_TAKEN", undefined, 409), setError, { codeFields: { PHONE_TAKEN: "phone" } })).toBe(
      true,
    );
    expect(setError).toHaveBeenCalledWith(
      "phone",
      { type: "server", message: "This phone number is already registered." },
      { shouldFocus: true },
    );
  });

  it("returns false when nothing maps", () => {
    const setError = vi.fn();
    expect(applyFieldErrors(err("FORBIDDEN", undefined, 403), setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});

describe("special error details", () => {
  it("reads MULTIPLE_COMPANIES choices", () => {
    const companies = [{ tenantId: "t1", name: "Malik & Sons Builders", role: "MUNSHI" }];
    expect(companyChoices(err("MULTIPLE_COMPANIES", { companies }, 409))).toEqual(companies);
    expect(companyChoices(err("OTHER"))).toEqual([]);
  });

  it("reads PLAN_LIMIT_REACHED details", () => {
    expect(planLimitDetails(err("PLAN_LIMIT_REACHED", { resource: "activeProjects", limit: 5, used: 5 }, 402))).toEqual({
      resource: "activeProjects",
      limit: 5,
      used: 5,
    });
    expect(planLimitDetails(err("OTHER"))).toBeNull();
  });
});
