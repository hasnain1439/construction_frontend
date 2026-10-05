/**
 * Pakistani phone numbers — same rules as the backend (`core/utils/phone.ts`).
 *
 *   03001234567 · +92 300 1234567 · 923001234567 · 0092-300-1234567 → +923001234567
 *   042-35761234 (landline, office numbers only)                    → +924235761234
 */

const E164_PK_MOBILE = /^\+923\d{9}$/;

function digitsOf(input: string): string | null {
  let digits = input.trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("0092")) digits = digits.slice(2);
  return /^\d+$/.test(digits) ? digits : null;
}

/** Mobile number → "+923XXXXXXXXX", or null when it isn't a valid PK mobile. */
export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = digitsOf(input);
  if (!digits) return null;
  let national: string;
  if (digits.startsWith("92") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  else if (digits.length === 10) national = digits;
  else return null;
  const e164 = `+92${national}`;
  return E164_PK_MOBILE.test(e164) ? e164 : null;
}

/** Mobile or landline (suppliers, clients, company office) → E.164, or null. */
export function normaliseAnyPhone(input: string | null | undefined): string | null {
  const mobile = normalisePhone(input);
  if (mobile) return mobile;
  if (!input) return null;
  const digits = digitsOf(input);
  if (!digits) return null;
  let national: string;
  if (digits.startsWith("92")) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else return null;
  return /^[124-9]\d{8,9}$/.test(national) ? `+92${national}` : null;
}

export const isValidPhone = (input: string | null | undefined) => normalisePhone(input) !== null;
export const isValidAnyPhone = (input: string | null | undefined) => normaliseAnyPhone(input) !== null;

/** "+923001234567" → "+92 300 1234567"; landlines "+924235761234" → "+92 42 35761234". */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const e164 = normaliseAnyPhone(phone) ?? phone;
  if (!e164.startsWith("+92")) return phone;
  const national = e164.slice(3);
  if (national.startsWith("3") && national.length === 10) return `+92 ${national.slice(0, 3)} ${national.slice(3)}`;
  // Two-digit area codes (Lahore 42, Karachi 21, Islamabad 51 …).
  return `+92 ${national.slice(0, 2)} ${national.slice(2)}`;
}

/** "+923001234567" → "0300 1234567" (how people type it). */
export function toLocalPhone(phone: string | null | undefined): string {
  const e164 = normaliseAnyPhone(phone);
  if (!e164) return phone ?? "";
  const national = e164.slice(3);
  return national.startsWith("3") ? `0${national.slice(0, 3)} ${national.slice(3)}` : `0${national}`;
}

export const PHONE_ERROR = "Enter a valid Pakistani mobile number, e.g. 0300 1234567";
export const ANY_PHONE_ERROR = "Enter a valid mobile or landline number, e.g. 042 35761234";
