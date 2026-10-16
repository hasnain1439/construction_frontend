/**
 * Backend error codes → friendly messages (English + Roman Urdu), and VALIDATION_ERROR
 * field issues → React Hook Form errors.
 */
import type { ApiError, CompanyChoice, FieldIssue } from "@/api/types";
import type { UiLanguage } from "@/store/slices/uiSlice";

/** `ur` = Roman Urdu; `urdu` = Urdu script (falls back to Roman Urdu). */
type Message = { en: string; ur: string; urdu?: string };

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
  SMS_UNAVAILABLE: {
    en: "The code could not be sent right now. Try again in a minute.",
    ur: "Code abhi nahi bheja ja saka. Ek minute baad dobara koshish karein.",
    urdu: "کوڈ ابھی نہیں بھیجا جا سکا۔ ایک منٹ بعد دوبارہ کوشش کریں۔",
  },
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

  // Permissions (PERMISSIONS_API.md §4)
  PERMISSION_DENIED: {
    en: "You don't have permission for this. Ask your Thekedar.",
    ur: "Aap ko is ki ijazat nahi. Apne Thekedar se kahein.",
    urdu: "آپ کو اس کی اجازت نہیں۔ اپنے ٹھیکیدار سے کہیں۔",
  },
  APPROVAL_LIMIT_EXCEEDED: {
    en: "This amount is above your approval limit — the owner approves it.",
    ur: "Ye raqam aap ki manzoori ki had se zyada hai.",
    urdu: "یہ رقم آپ کی منظوری کی حد سے زیادہ ہے۔",
  },
  OWNER_ONLY_PERMISSION: { en: "Only the owner can have this permission.", ur: "Ye ijazat sirf maalik ke paas ho sakti hai.", urdu: "یہ اجازت صرف مالک کے پاس ہو سکتی ہے۔" },
  ROLE_IS_SYSTEM: { en: "System templates can't be changed — duplicate it first.", ur: "System template nahi badalta — pehle copy banayein.", urdu: "سسٹم ٹیمپلیٹ نہیں بدلتا — پہلے کاپی بنائیں۔" },
  CANNOT_EDIT_OWNER: { en: "The Thekedar's permissions can't be changed.", ur: "Thekedar ki ijazatein nahi badal sakti.", urdu: "ٹھیکیدار کی اجازتیں نہیں بدل سکتیں۔" },
  CANNOT_EDIT_OWN_PERMISSIONS: { en: "You can't change your own permissions.", ur: "Aap apni ijazatein khud nahi badal sakte.", urdu: "آپ اپنی اجازتیں خود نہیں بدل سکتے۔" },
  GRANT_EXCEEDS_OWN: { en: "You can only give permissions you have yourself.", ur: "Aap sirf wohi ijazat de sakte hain jo aap ke paas hai.", urdu: "آپ صرف وہی اجازت دے سکتے ہیں جو آپ کے پاس ہے۔" },
  ROLE_NOT_FOR_ACCOUNT: { en: "This role doesn't fit this kind of account.", ur: "Ye role is qisam ke account ke liye nahi.", urdu: "یہ رول اس قسم کے اکاؤنٹ کے لیے نہیں۔" },
  ROLE_NOT_FOUND: { en: "This role no longer exists.", ur: "Ye role ab maujood nahi.", urdu: "یہ رول اب موجود نہیں۔" },
  ROLE_NAME_TAKEN: { en: "A role with this name already exists.", ur: "Is naam ka role pehle se hai.", urdu: "اس نام کا رول پہلے سے ہے۔" },
  ROLE_IN_USE: { en: "Members of another account type have this role.", ur: "Doosri qisam ke members ke paas ye role hai.", urdu: "دوسری قسم کے ممبرز کے پاس یہ رول ہے۔" },
  UNKNOWN_PERMISSION: { en: "Unknown permission.", ur: "Na-maloom ijazat.", urdu: "نامعلوم اجازت۔" },
  DUPLICATE_PERMISSION: { en: "A permission is listed twice.", ur: "Ek ijazat do dafa hai.", urdu: "ایک اجازت دو دفعہ ہے۔" },
  DENY_HAS_NO_SCOPE: { en: "A removed permission has no project scope or limit.", ur: "Hatai gayi ijazat ka scope ya had nahi hoti.", urdu: "ہٹائی گئی اجازت کا اسکوپ یا حد نہیں ہوتی۔" },
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

  // Onboarding: imports, opening balances, demo data
  FILE_REQUIRED: { en: "Choose the filled template (.xlsx or .csv).", ur: "Bhara hua template (.xlsx ya .csv) chunein.", urdu: "بھرا ہوا ٹیمپلیٹ (.xlsx یا .csv) چنیں۔" },
  INVALID_FILE: { en: "This Excel file could not be read — save it as .xlsx and try again.", ur: "Yeh Excel file parhi nahi ja saki — .xlsx mein save kar ke dobara koshish karein.", urdu: "یہ ایکسل فائل پڑھی نہیں جا سکی — .xlsx میں محفوظ کر کے دوبارہ کوشش کریں۔" },
  EMPTY_FILE: { en: "The file is empty.", ur: "File khaali hai.", urdu: "فائل خالی ہے۔" },
  TOO_MANY_ROWS: { en: "At most 1000 rows per file — split it into smaller files.", ur: "Ek file mein zyada se zyada 1000 lines — choti files banayein.", urdu: "ایک فائل میں زیادہ سے زیادہ 1000 لائنیں — چھوٹی فائلیں بنائیں۔" },
  MISSING_COLUMNS: { en: "Some required columns are missing — download the template and use its headers.", ur: "Kuch zaroori columns ghayab hain — template download kar ke us ke headers istemal karein.", urdu: "کچھ ضروری کالم موجود نہیں — ٹیمپلیٹ ڈاؤن لوڈ کر کے اس کے ہیڈر استعمال کریں۔" },
  IMPORT_HAS_ERRORS: { en: "Some rows have errors — fix them or import only the valid rows.", ur: "Kuch lines mein ghaltiyan hain — theek karein ya sirf sahi lines import karein.", urdu: "کچھ لائنوں میں غلطیاں ہیں — درست کریں یا صرف درست لائنیں امپورٹ کریں۔" },
  NOTHING_TO_IMPORT: { en: "The file has no rows to import.", ur: "File mein import karne ko koi line nahi.", urdu: "فائل میں امپورٹ کرنے کو کوئی لائن نہیں۔" },
  IMPORT_CONFLICT: { en: "Someone added one of these records meanwhile — preview the file again.", ur: "Isi dauran kisi ne in mein se koi record shamil kar diya — file dobara check karein.", urdu: "اسی دوران کسی نے ان میں سے کوئی ریکارڈ شامل کر دیا — فائل دوبارہ چیک کریں۔" },
  OPENING_LOCKED: { en: "The opening balance of this item is already saved and locked.", ur: "Is ka opening balance pehle hi save aur lock ho chuka hai.", urdu: "اس کا ابتدائی بیلنس پہلے ہی محفوظ اور لاک ہو چکا ہے۔" },
  DATE_IN_FUTURE: { en: "The date can't be in the future.", ur: "Aane wali tareekh nahi ho sakti.", urdu: "آنے والی تاریخ نہیں ہو سکتی۔" },
  DEMO_EXISTS: { en: "Demo data is already in your company.", ur: "Demo data pehle se aap ki company mein hai.", urdu: "ڈیمو ڈیٹا پہلے سے آپ کی کمپنی میں ہے۔" },
  DEMO_NOT_FOUND: { en: "There is no demo data to remove.", ur: "Hatane ke liye koi demo data nahi.", urdu: "ہٹانے کے لیے کوئی ڈیمو ڈیٹا نہیں۔" },
  // Step 16 — equipment & shuttering
  EQUIPMENT_EXISTS: { en: "Equipment with this name or code already exists.", ur: "Is naam ya code ka saman pehle se hai.", urdu: "اس نام یا کوڈ کا سامان پہلے سے ہے۔" },
  EQUIPMENT_NOT_FOUND: { en: "Equipment not found.", ur: "Saman nahi mila.", urdu: "سامان نہیں ملا۔" },
  INSUFFICIENT_EQUIPMENT: { en: "Not that many there — check the count.", ur: "Itna wahan mojood nahi — ginti check karein.", urdu: "اتنا وہاں موجود نہیں — گنتی چیک کریں۔" },
  INVALID_LOCATION: { en: "Choose the yard or a site.", ur: "Yard ya site chunein.", urdu: "یارڈ یا سائٹ چنیں۔" },
  LOCATION_NOT_FOUND: { en: "Location not found.", ur: "Jagah nahi mili.", urdu: "جگہ نہیں ملی۔" },
  INVALID_RENTAL: { en: "That rental doesn't hold this equipment.", ur: "Is kiraye mein yeh saman nahi.", urdu: "اس کرائے میں یہ سامان نہیں۔" },
  TRANSFER_NOT_FOUND: { en: "Transfer not found.", ur: "Transfer nahi mila.", urdu: "ٹرانسفر نہیں ملا۔" },
  TRANSFER_CANCELLED: { en: "This transfer was cancelled.", ur: "Yeh transfer mansookh ho chuka hai.", urdu: "یہ ٹرانسفر منسوخ ہو چکا ہے۔" },
  TRANSFER_NOT_CANCELLABLE: { en: "Only a transfer still on the way can be cancelled.", ur: "Sirf raste wala transfer mansookh ho sakta hai.", urdu: "صرف راستے والا ٹرانسفر منسوخ ہو سکتا ہے۔" },
  ITEMS_MISMATCH: { en: "Count every item on the transfer.", ur: "Transfer ka har saman ginein.", urdu: "ٹرانسفر کا ہر سامان گنیں۔" },
  NOTE_REQUIRED: { en: "Short or damaged — add a note.", ur: "Kam ya kharab — note likhein.", urdu: "کم یا خراب — نوٹ لکھیں۔" },
  RECEIVED_EXCEEDS_SENT: { en: "More counted than sent — check the count.", ur: "Bheje se zyada gina — ginti check karein.", urdu: "بھیجے سے زیادہ گنا — گنتی چیک کریں۔" },
  RENTAL_NOT_FOUND: { en: "Rental not found.", ur: "Kiraya nahi mila.", urdu: "کرایہ نہیں ملا۔" },
  RENTAL_NOT_ACTIVE: { en: "This rental is no longer active.", ur: "Yeh kiraya ab chalu nahi.", urdu: "یہ کرایہ اب چالو نہیں۔" },
  RENTAL_NOT_RETURNED: { en: "Return everything before closing the rental.", ur: "Band karne se pehle sab wapas karein.", urdu: "بند کرنے سے پہلے سب واپس کریں۔" },
  RETURN_EXCEEDS_OUTSTANDING: { en: "More than is still out on this rental.", ur: "Is kiraye ke baqi se zyada.", urdu: "اس کرائے کے باقی سے زیادہ۔" },
  MISSING_NOT_REPORTED: { en: "Report the missing pieces in Loss & Damage first.", ur: "Gum saman pehle Nuqsan mein report karein.", urdu: "گم سامان پہلے نقصان میں رپورٹ کریں۔" },
  REFUND_EXCEEDS_DEPOSIT: { en: "The refund can't be more than the deposit.", ur: "Wapsi deposit se zyada nahi ho sakti.", urdu: "واپسی ڈپازٹ سے زیادہ نہیں ہو سکتی۔" },
  LOSS_NOT_FOUND: { en: "Loss not found.", ur: "Nuqsan nahi mila.", urdu: "نقصان نہیں ملا۔" },
  LOSS_ALREADY_CHARGED: { en: "This loss has already been charged.", ur: "Yeh nuqsan pehle hi charge ho chuka hai.", urdu: "یہ نقصان پہلے ہی چارج ہو چکا ہے۔" },
  NOTHING_TO_CHARGE: { en: "Enter the value to charge (no replacement value is set).", ur: "Charge ki raqam likhein (nayi qeemat set nahi).", urdu: "چارج کی رقم لکھیں (نئی قیمت سیٹ نہیں)۔" },
  NO_PROJECT: { en: "This loss is not at a project site — write it off or charge a sub-contractor.", ur: "Yeh nuqsan kisi project site par nahi — write off karein ya theke daar par charge karein.", urdu: "یہ نقصان کسی پراجیکٹ سائٹ پر نہیں — ختم کریں یا ٹھیکیدار پر چارج کریں۔" },
  ASSIGNMENT_REQUIRED: { en: "Choose the sub-contractor.", ur: "Theke daar chunein.", urdu: "ٹھیکیدار چنیں۔" },
  DATE_NOT_COMPLETE: { en: "Charges can only be posted for days that are over.", ur: "Sirf guzre hue dinon ke charges darj ho sakte hain.", urdu: "صرف گزرے ہوئے دنوں کے چارجز درج ہو سکتے ہیں۔" },
  DEMO_IN_USE: { en: "Some of your real data uses the demo records (for example a demo worker on a real project) — undo that first.", ur: "Aap ka asal data demo records istemal kar raha hai (maslan demo mazdoor asal project par) — pehle usay hatayein.", urdu: "آپ کا اصل ڈیٹا ڈیمو ریکارڈز استعمال کر رہا ہے (مثلاً ڈیمو مزدور اصل پراجیکٹ پر) — پہلے اسے ہٹائیں۔" },
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
    // Urdu-script mode shows the Roman Urdu message when a message has no Urdu script yet.
    if (known) return language === "ur" && known.urdu ? known.urdu : language !== "en" ? known.ur : known.en;
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
