import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone, normaliseAnyPhone, normalisePhone, toLocalPhone } from "@/lib/phone";

describe("normalisePhone (mobile, same rules as the backend)", () => {
  it.each([
    ["03001234567", "+923001234567"],
    ["+92 300 1234567", "+923001234567"],
    ["923001234567", "+923001234567"],
    ["0092-300-1234567", "+923001234567"],
    ["(0300) 123-4567", "+923001234567"],
    ["3001234567", "+923001234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  it.each(["", "0300123456", "030012345678", "04235761234", "+44 7700 900123", "phone", "+92300123456a"])(
    "rejects %s",
    (input) => {
      expect(normalisePhone(input)).toBeNull();
      expect(isValidPhone(input)).toBe(false);
    },
  );
});

describe("normaliseAnyPhone (mobile or landline)", () => {
  it("accepts landlines", () => {
    expect(normaliseAnyPhone("042-35761234")).toBe("+924235761234");
    expect(normaliseAnyPhone("051 1234567")).toBe("+92511234567");
    expect(normaliseAnyPhone("+92 21 34567890")).toBe("+922134567890");
  });

  it("still prefers mobile normalisation", () => {
    expect(normaliseAnyPhone("0300 1234567")).toBe("+923001234567");
  });

  it("rejects garbage", () => {
    expect(normaliseAnyPhone("12345")).toBeNull();
    expect(normaliseAnyPhone("0042")).toBeNull();
  });
});

describe("display", () => {
  it("formats E.164 for people", () => {
    expect(formatPhone("+923001234567")).toBe("+92 300 1234567");
    expect(formatPhone("+924235761234")).toBe("+92 42 35761234");
    expect(formatPhone(null)).toBe("—");
    expect(toLocalPhone("+923001234567")).toBe("0300 1234567");
  });
});
