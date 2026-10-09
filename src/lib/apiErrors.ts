/**
 * Backend error codes → friendly messages (English + Roman Urdu), and VALIDATION_ERROR
 * field issues → React Hook Form errors.
 */
import type { ApiError, CompanyChoice, FieldIssue } from "@/api/types";
import type { UiLanguage } from "@/store/slices/uiSlice";

type Message = { en: string; ur: string };

const MESSAGES: Record<string, Message> = {
  NETWORK_ERROR: {
    en: "Can't reach the server. Check your internet connection and try again.",
    ur: "Server se rabta nahi ho saka. Internet check kar ke dobara koshish karein.",
  },
  TIMEOUT: { en: "The server is taking too long. Please try again.", ur: "Server bohat der laga raha hai. Dobara koshish karein." },
  UPSTREAM_ERROR: {
    en: "Couldn't reach the server just now. Please try again.",
    ur: "Abhi server se rabta nahi ho saka. Dobara koshish karein.",
  },
  INTERNAL_ERROR: { en: "Something went wrong on our side. Please try again.", ur: "Hamari taraf koi masla hua. Dobara koshish karein." },
  RATE_LIMITED: { en: "Too many attempts. Wait a minute and try again.", ur: "Bohat zyada koshishein. Ek minute ruk kar dobara karein." },
  VALIDATION_ERROR: { en: "Some fields need attention.", ur: "Kuch fields theek karni hain." },

  // Auth
  INVALID_CREDENTIALS: { en: "Wrong phone/email or password.", ur: "Phone/email ya password ghalat hai." },
  ACCOUNT_LOCKED: {
    en: "Too many wrong passwords. Try again later.",
    ur: "Bohat dafa ghalat password. Thori dair baad koshish karein.",
  },
  USE_OTP_LOGIN: { en: "This account signs in with a phone code (OTP).", ur: "Yeh account phone code (OTP) se login hota hai." },
  PHONE_NOT_REGISTERED: { en: "This phone number isn't registered.", ur: "Yeh phone number register nahi hai." },
  OTP_INVALID: { en: "That code is not correct.", ur: "Code ghalat hai." },
  OTP_EXPIRED: { en: "That code has expired. Ask for a new one.", ur: "Code expire ho gaya. Naya code mangwayein." },
  OTP_RESEND_WAIT: { en: "Wait a moment before asking for another code.", ur: "Naya code mangwane se pehle thora intezar karein." },
  OTP_LIMIT_REACHED: { en: "Too many codes requested. Try again in an hour.", ur: "Bohat code mangwaye gaye. Ek ghante baad koshish karein." },
  OTP_TOO_MANY_ATTEMPTS: { en: "Too many wrong codes. Ask for a new one.", ur: "Bohat ghalat code. Naya code mangwayein." },
  MULTIPLE_COMPANIES: { en: "Choose which company to sign in to.", ur: "Company chunein jis mein login karna hai." },
  COMPANY_SUSPENDED: { en: "This company account is suspended.", ur: "Is company ka account band hai." },
  ACCOUNT_DISABLED: { en: "Your account has been deactivated.", ur: "Aap ka account band kar diya gaya hai." },
  SESSION_REVOKED: { en: "You were signed out. Please sign in again.", ur: "Aap logout ho gaye. Dobara login karein." },
  DEVICE_REVOKED: { en: "This device was logged out. Please sign in again.", ur: "Is device ko logout kiya gaya. Dobara login karein." },
  REFRESH_TOKEN_REUSED: { en: "For your safety you were signed out everywhere.", ur: "Hifazat ke liye aap har jagah se logout ho gaye." },
  CURRENT_PASSWORD_WRONG: { en: "Current password is incorrect.", ur: "Mojooda password ghalat hai." },
  PHONE_TAKEN: { en: "This phone number is already registered.", ur: "Yeh phone number pehle se register hai." },
  EMAIL_TAKEN: { en: "This email is already in use.", ur: "Yeh email pehle se istemal mein hai." },
  INVITE_NOT_FOUND: { en: "This invitation link is not valid.", ur: "Yeh invitation link durust nahi." },
  INVITE_EXPIRED: { en: "This invitation has expired. Ask your Thekedar for a new link.", ur: "Invitation expire ho gayi. Thekedar se naya link mangwayein." },
  INVITE_CANCELLED: { en: "This invitation was cancelled. Ask your Thekedar for a new link.", ur: "Invitation cancel ho gayi. Thekedar se naya link mangwayein." },
  INVITE_ALREADY_ACCEPTED: { en: "This invitation was already used. Sign in instead.", ur: "Yeh invitation istemal ho chuki. Login karein." },

  // Account state
  ACCOUNT_READ_ONLY: {
    en: "Your company is read-only until the subscription is renewed.",
    ur: "Subscription renew hone tak records sirf dekhe ja sakte hain.",
  },
  PLAN_LIMIT_REACHED: { en: "Your plan limit is reached. Upgrade to continue.", ur: "Plan ki had poori ho gayi. Aage barhne ke liye upgrade karein." },
  FORBIDDEN: { en: "You don't have access to this.", ur: "Aap ko is ki ijazat nahi." },
  NOT_FOUND: { en: "Not found.", ur: "Nahi mila." },

  // Team
  CANNOT_CHANGE_OWN_ROLE: { en: "You can't change your own role.", ur: "Aap apna role khud nahi badal sakte." },
  CANNOT_CHANGE_OWNER_ROLE: { en: "The owner's role can't be changed.", ur: "Owner ka role nahi badla ja sakta." },
  CANNOT_DEACTIVATE_SELF: { en: "You can't deactivate yourself.", ur: "Aap khud ko band nahi kar sakte." },
  LAST_THEKEDAR: { en: "The last Thekedar can't be deactivated.", ur: "Aakhri Thekedar ko band nahi kiya ja sakta." },
  CASH_BALANCE_OPEN: { en: "Hand over the cash balance first.", ur: "Pehle cash balance hawale karein." },
  ALREADY_MEMBER: { en: "This person is already in your team.", ur: "Yeh shakhs pehle se team mein hai." },
  INVITE_PENDING: { en: "An invitation is already pending for this phone.", ur: "Is phone ke liye invitation pehle se pending hai." },
  INVITE_RESEND_WAIT: { en: "Wait a minute before resending.", ur: "Dobara bhejne se pehle ek minute ruk jayein." },
  USER_ALREADY_ACTIVE: { en: "This member is already active.", ur: "Yeh member pehle se active hai." },
  CANNOT_REVOKE_CURRENT_DEVICE: { en: "You can't log out the device you're using.", ur: "Jis device par aap hain usay logout nahi kar sakte." },
  THEKEDAR_HAS_ALL_PROJECTS: { en: "A Thekedar already works on every project.", ur: "Thekedar har project par kaam karta hai." },
  FINANCIALS_PM_ONLY: { en: "Only a PM can be given financial access.", ur: "Sirf PM ko financial access diya ja sakta hai." },

  // Company / holidays / attachments
  HOLIDAY_IN_PAST: { en: "A holiday can't start in the past.", ur: "Chhutti guzri hui tareekh se shuru nahi ho sakti." },
  HOLIDAY_EXISTS: { en: "A holiday already exists on these dates.", ur: "In tareekhon par chhutti pehle se hai." },
  FILE_TOO_LARGE: { en: "The file is larger than 10 MB.", ur: "File 10 MB se bari hai." },
  INVALID_FILE_TYPE: { en: "This file type isn't allowed here.", ur: "Is qisam ki file yahan allowed nahi." },
  ATTACHMENT_NOT_FOUND: { en: "The uploaded file was not found. Upload it again.", ur: "Upload ki hui file nahi mili. Dobara upload karein." },

  // Subscription
  AMOUNT_MISMATCH: { en: "The amount must equal the plan price.", ur: "Raqam plan ki qeemat ke barabar honi chahiye." },
  PAYMENT_PENDING: { en: "A payment is already waiting for review.", ur: "Ek payment pehle se review ke liye pending hai." },
  DUPLICATE_TRANSACTION: { en: "This transaction ID was already used.", ur: "Yeh transaction ID pehle istemal ho chuki hai." },
  PAID_ON_IN_FUTURE: { en: "Payment date can't be in the future.", ur: "Payment ki tareekh aage ki nahi ho sakti." },
  PAID_ON_TOO_OLD: { en: "Payment date must be within the last 30 days.", ur: "Payment pichle 30 din ke andar honi chahiye." },
  SAME_PLAN: { en: "You're already on this plan.", ur: "Aap pehle se isi plan par hain." },
  DOWNGRADE_USERS_OVER_LIMIT: {
    en: "Too many office users for that plan. Deactivate some first.",
    ur: "Us plan ke liye office users zyada hain. Pehle kuch band karein.",
  },
  KEEP_PROJECTS_REQUIRED: { en: "Choose which projects stay active.", ur: "Chunein kaun se projects active rahenge." },
  TOO_MANY_PROJECTS: { en: "You picked more projects than the plan allows.", ur: "Plan se zyada projects chune gaye." },
  NO_PENDING_CHANGE: { en: "There is no pending plan change.", ur: "Koi pending plan change nahi." },

  // Master data
  MATERIAL_EXISTS: { en: "A material with this name already exists.", ur: "Is naam ka material pehle se hai." },
  MATERIAL_IN_USE: {
    en: "Used in estimates and stock. You can hide it instead.",
    ur: "Yeh estimates aur stock mein istemal hua hai. Isay chhupa sakte hain.",
  },
  UNIT_LOCKED: { en: "The unit can't change once rates exist.", ur: "Rates ke baad unit nahi badal sakti." },
  CATEGORY_EXISTS: { en: "A category with this name or code already exists.", ur: "Is naam ya code ki category pehle se hai." },
  CATEGORY_IS_DEFAULT: { en: "The default category can't be archived.", ur: "Default category archive nahi ho sakti." },
  LAST_ACTIVE_CATEGORY: { en: "Keep at least one active category.", ur: "Kam az kam ek active category rakhein." },
  PERCENT_TOTAL_INVALID: { en: "Stages must add up to exactly 100%.", ur: "Stages ka jor poora 100% hona chahiye." },
  RETENTION_STAGE_INVALID: { en: "Only one retention stage is allowed.", ur: "Sirf ek retention stage ho sakti hai." },
  TEMPLATE_IS_DEFAULT: { en: "The default template can't be deleted.", ur: "Default template delete nahi ho sakta." },
  TEMPLATE_EXISTS: { en: "A template with this name already exists.", ur: "Is naam ka template pehle se hai." },
  SUPPLIER_EXISTS: { en: "A supplier with this name already exists.", ur: "Is naam ka supplier pehle se hai." },
  WORKER_PHONE_TAKEN: { en: "Another worker has this phone number.", ur: "Yeh phone kisi aur worker ka hai." },
  SUBCONTRACTOR_EXISTS: { en: "This sub-contractor already exists.", ur: "Yeh sub-contractor pehle se hai." },
  DAILY_RATE_REQUIRED: { en: "Enter a daily rate for this worker type.", ur: "Is worker ke liye daily rate likhein." },

  // Clients & projects
  CLIENT_PHONE_TAKEN: { en: "Another client has this phone number.", ur: "Yeh phone kisi aur client ka hai." },
  PROJECT_CODE_TAKEN: { en: "This contract reference is already used.", ur: "Yeh contract reference pehle istemal ho chuka." },
  PROJECT_NOT_DRAFT: { en: "Only draft projects can be deleted.", ur: "Sirf draft projects delete ho sakte hain." },
  PROJECT_LOCKED: { en: "This project is locked and can't be edited.", ur: "Yeh project lock hai, edit nahi ho sakta." },
  PROJECT_NOT_READY: { en: "Fix the errors on the Review tab first.", ur: "Pehle Review tab ki ghaltiyan theek karein." },
  INVALID_STATUS_TRANSITION: { en: "That status change isn't allowed.", ur: "Yeh status change allowed nahi." },
  INVALID_DATES: { en: "End date can't be before the start date.", ur: "End date start date se pehle nahi ho sakti." },
  SUPPLY_RULE_LOCKED: { en: "This supply row is locked.", ur: "Yeh supply row lock hai." },
  BILLING_STAGES_LOCKED: { en: "Billing stages are locked after invoicing.", ur: "Invoice ke baad billing stages lock hain." },
  FLOOR_HAS_ROOMS: { en: "This floor has rooms. Remove them first.", ur: "Is floor par rooms hain. Pehle unhein hatayein." },
  FLOOR_NOT_EMPTY: { en: "The target floor already has rooms.", ur: "Target floor par pehle se rooms hain." },
  OPENINGS_EXCEED_WALL: { en: "Openings are larger than the walls.", ur: "Darwaze/khirkiyan deewar se bare hain." },

  // Procurement & inventory (messages with material names / quantities come from the server)
  SERVICE_BUSY: { en: "The server is busy. Please try again in a moment.", ur: "Server masroof hai. Thori dair baad dobara koshish karein." },
  ALREADY_RECEIVED: { en: "This delivery has already been received.", ur: "Yeh maal pehle hi wusool ho chuka hai." },
  DISPATCH_CANCELLED: { en: "This dispatch was cancelled.", ur: "Yeh dispatch cancel ho chuki hai." },
  DISPATCH_NOT_CANCELLABLE: { en: "Only a dispatch that is still on the way can be cancelled.", ur: "Sirf raste mein maujood dispatch cancel ho sakti hai." },
  SHORTAGE_RESOLVED: { en: "This shortage has already been resolved.", ur: "Is kami ka faisla pehle ho chuka hai." },
  RATES_ALREADY_SET: { en: "This purchase already has its rates.", ur: "Is kharidari ke rates pehle se lag chuke hain." },
  CHALLAN_REQUIRED: { en: "Upload the challan photo.", ur: "Challan ki photo upload karein." },
  PURCHASE_ORDER_HAS_RECEIPTS: { en: "Goods were already received against this order; it can't be cancelled.", ur: "Is order par maal aa chuka hai, cancel nahi ho sakta." },
  PURCHASE_ORDER_LOCKED: { en: "Only an open order without deliveries can be changed.", ur: "Sirf khula order (bina maal) badla ja sakta hai." },
  PO_CLOSED: { en: "This purchase order is closed.", ur: "Yeh purchase order band hai." },
  CHEQUE_ALREADY_SETTLED: { en: "This cheque is already settled.", ur: "Is cheque ka faisla ho chuka hai." },
  PROJECT_IS_DRAFT: { en: "Activate the project before moving stock to its site.", ur: "Stock bhejne se pehle project active karein." },
  SAME_LOCATION: { en: "Choose a different destination.", ur: "Koi aur jagah chunein." },
  RESOLUTION_NOT_ALLOWED: { en: "That decision doesn't apply to this shortage.", ur: "Yeh faisla is kami par laagu nahi hota." },

  // Labour & cash book (messages with amounts / dates come from the server)
  WORKER_NOT_ASSIGNED: { en: "Some workers are not on this site — add them in Team on Site first.", ur: "Kuch mazdoor is site par nahi — pehle Team on Site mein shamil karein." },
  WORKER_ALREADY_ASSIGNED: { en: "This worker is already on this site.", ur: "Yeh mazdoor pehle se is site par hai." },
  RATE_CHANGE_NOT_ALLOWED: { en: "A munshi assigns at the worker's normal rate — the office can change it.", ur: "Munshi mazdoor ke aam rate par hi lagata hai — rate office badal sakta hai." },
  PAID_FROM_NOT_ALLOWED: { en: "A munshi pays from site cash only.", ur: "Munshi sirf site cash se adaigi kar sakta hai." },
  FUTURE_DATE: { en: "The date can't be in the future.", ur: "Aane wali tareekh nahi ho sakti." },
  FUTURE_WEEK: { en: "This week hasn't started yet.", ur: "Yeh hafta abhi shuru nahi hua." },
  SETTLEMENT_NOT_APPROVED: { en: "Wages can be paid only after approval.", ur: "Mazdoori approval ke baad hi di ja sakti hai." },
  SETTLEMENT_NOT_SUBMITTED: { en: "Only a submitted week can be approved or returned.", ur: "Sirf jama shuda hafta approve ya wapas ho sakta hai." },
  SETTLEMENT_PAID: { en: "Some wages are already paid — this week can't be returned now.", ur: "Kuch mazdoori di ja chuki hai — yeh hafta ab wapas nahi ho sakta." },
  ALREADY_PAID: { en: "Some workers are already paid.", ur: "Kuch mazdooron ko pehle hi adaigi ho chuki hai." },
  EMPTY_SETTLEMENT: { en: "Nobody worked this week — nothing to submit.", ur: "Is hafte kisi ne kaam nahi kiya — jama karne ko kuch nahi." },
  MEASUREMENT_NOT_PENDING: { en: "This measurement is already decided.", ur: "Is paimaish ka faisla ho chuka hai." },
  LUMPSUM_USES_PROGRESS: { en: "A lump-sum contract is paid by % progress, not measurements.", ur: "Theka (lump sum) % taraqqi se chalta hai, paimaish se nahi." },
  ALREADY_ACKNOWLEDGED: { en: "This float is already acknowledged.", ur: "Yeh raqam pehle hi wusool tasleem ho chuki hai." },
  EXPENSE_NOT_PENDING: { en: "This kharcha is already decided.", ur: "Is kharche ka faisla ho chuka hai." },
  OWN_EXPENSE: { en: "Your own kharcha is approved by the owner.", ur: "Apna kharcha maalik approve karta hai." },
  TOPUP_PENDING: { en: "You already have a top-up request waiting.", ur: "Aap ki top-up darkhwast pehle se zair-e-ghaur hai." },
  TOPUP_DECIDED: { en: "This request is already decided.", ur: "Is darkhwast ka faisla ho chuka hai." },
  NO_CASH_ACCOUNT: { en: "You hold no site cash yet — the office sends a float first.", ur: "Aap ke paas abhi site cash nahi — pehle office raqam bheje." },
  INVALID_HOLDER: { en: "Choose an active munshi or project manager.", ur: "Koi active munshi ya PM chunein." },
};

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "status" in value &&
    typeof (value as ApiError).code === "string"
  );
}

/** Friendly message for any thrown value (RTK Query error, ApiError, Error). */
export function getErrorMessage(error: unknown, language: UiLanguage = "en"): string {
  if (isApiError(error)) {
    if (error.code === "ACCOUNT_LOCKED") {
      const minutes = lockedMinutes(error);
      if (minutes) {
        return language !== "en"
          ? `Bohat dafa ghalat password. ${minutes} minute baad koshish karein.`
          : `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
      }
    }
    if (error.code === "PERCENT_TOTAL_INVALID") {
      const total = (error.details as { total?: number } | undefined)?.total;
      if (typeof total === "number") {
        return language !== "en" ? `Jor ${total}% hai — 100% hona chahiye.` : `${total}% — must be 100%.`;
      }
    }
    const known = MESSAGES[error.code];
    // Urdu-script mode shows the Roman Urdu messages until they are translated.
    if (known) return language !== "en" ? known.ur : known.en;
    return error.message || MESSAGES.INTERNAL_ERROR.en;
  }
  if (error instanceof Error && error.message) return error.message;
  return language !== "en" ? MESSAGES.INTERNAL_ERROR.ur : MESSAGES.INTERNAL_ERROR.en;
}

export function errorCode(error: unknown): string | null {
  return isApiError(error) ? error.code : null;
}

/** VALIDATION_ERROR `details.fields`, plus single-field codes mapped by the caller. */
export function fieldIssues(error: unknown): FieldIssue[] {
  if (!isApiError(error)) return [];
  const fields = (error.details as { fields?: unknown } | undefined)?.fields;
  if (!Array.isArray(fields)) return [];
  return fields.filter(
    (f): f is FieldIssue => typeof f === "object" && f !== null && "field" in f && "message" in f,
  );
}

type SetError = (name: never, error: { type: string; message: string }, options?: { shouldFocus: boolean }) => void;

/**
 * Puts backend field errors on a React Hook Form. `fieldMap` renames API fields to form
 * fields (e.g. `{ login: "identifier" }`); `codeFields` routes a whole error code to one
 * field (e.g. `{ PHONE_TAKEN: "phone" }`). Returns true when at least one was applied.
 */
export function applyFieldErrors(
  error: unknown,
  setError: SetError,
  options: { fieldMap?: Record<string, string>; codeFields?: Record<string, string>; language?: UiLanguage } = {},
): boolean {
  let applied = false;
  let first = true;
  for (const issue of fieldIssues(error)) {
    const name = options.fieldMap?.[issue.field] ?? issue.field;
    if (name === "(root)") continue;
    setError(name as never, { type: "server", message: issue.message }, { shouldFocus: first });
    first = false;
    applied = true;
  }
  const code = errorCode(error);
  const target = code ? options.codeFields?.[code] : undefined;
  if (target) {
    setError(target as never, { type: "server", message: getErrorMessage(error, options.language) }, { shouldFocus: first });
    applied = true;
  }
  return applied;
}

/** Minutes left on a 423 ACCOUNT_LOCKED. */
export function lockedMinutes(error: unknown): number | null {
  if (!isApiError(error) || error.code !== "ACCOUNT_LOCKED") return null;
  const seconds = (error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
  return typeof seconds === "number" && seconds > 0 ? Math.ceil(seconds / 60) : null;
}

/** Companies offered by 409 MULTIPLE_COMPANIES. */
export function companyChoices(error: unknown): CompanyChoice[] {
  if (!isApiError(error) || error.code !== "MULTIPLE_COMPANIES") return [];
  const companies = (error.details as { companies?: CompanyChoice[] } | undefined)?.companies;
  return Array.isArray(companies) ? companies : [];
}

/** `{ resource, limit, used }` of 402 PLAN_LIMIT_REACHED. */
export function planLimitDetails(error: unknown): { resource?: string; limit?: number | null; used?: number } | null {
  if (!isApiError(error) || error.code !== "PLAN_LIMIT_REACHED") return null;
  return (error.details as { resource?: string; limit?: number | null; used?: number } | undefined) ?? {};
}
