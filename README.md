# Construction Platform — Web

Next.js web app for the multi-tenant Construction Management SaaS (Pakistani building contractors).
It talks to the Express API in `../construction-platform` and only builds screens for what that
backend already does (Phase 1, steps 1–5). Everything else in the menu opens a
"Coming in the next phase" page.

**Stack** — Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5.9 (strict) · Tailwind CSS 4 ·
shadcn/ui (Radix) · lucide-react · Redux Toolkit + RTK Query · React Hook Form + Zod · date-fns(-tz) ·
sonner · recharts · Vitest + Testing Library · Playwright · ESLint + Prettier.

## Setup

```powershell
# 1. Backend (separate terminal) — see ../construction-platform/README.md
cd ..\construction-platform
npm run dev                      # http://localhost:4000

# 2. Web
cd ..\construction-web
npm install
Copy-Item .env.local.example .env.local
npm run dev                      # http://localhost:3000
```

### Environment (`.env.local`)

| Variable                  | Default                 | What it does                                            |
| ------------------------- | ----------------------- | ------------------------------------------------------- |
| `API_ORIGIN`              | `http://localhost:4000` | Where `/api/v1/*` is proxied (next.config.ts rewrites). |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0`                 | Shown in the sticky footer.                             |

The browser never calls the API origin directly. `next.config.ts` rewrites `/api/v1/:path*` to
`${API_ORIGIN}/api/v1/:path*`, so the backend's httpOnly cookies (`access_token`, `refresh_token`,
`admin_*`) are first-party and no CORS is involved.

## Scripts

| Script                        | What it does                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                 | Dev server on :3000                                                                                                                      |
| `npm run build` / `npm start` | Production build / serve it                                                                                                              |
| `npm run lint`                | ESLint (0 warnings allowed)                                                                                                              |
| `npm run typecheck`           | `next typegen` + `tsc --noEmit`                                                                                                          |
| `npm test`                    | Vitest unit + component tests (`tests/`)                                                                                                 |
| `npm run e2e`                 | Playwright smoke tests (`e2e/`) — needs the backend running; starts `next start` (run `npm run build` first) or reuses a server on :3000 |
| `npm run api:types`           | Regenerates `src/api/generated/schema.ts` from the running backend's `/api/docs.json`                                                    |
| `npm run format`              | Prettier                                                                                                                                 |

## Seed accounts (backend `npm run db:seed`)

| Who                                             | Sign in with                               | Password                             |
| ----------------------------------------------- | ------------------------------------------ | ------------------------------------ |
| Thekedar — Khalid Malik (Malik & Sons Builders) | `0300 1234567` or `khalid@maliksons.pk`    | `Thekedar#2026`                      |
| PM — Bilal Ahmed (no financials)                | `0333 1112233`                             | `Bilal#2026`                         |
| Munshi — Rafaqat Ali (two companies)            | `0321 1234567` → **Phone OTP** tab         | code printed in the backend terminal |
| Platform admin                                  | `/admin/login` · `admin@platform.local`    | `Admin#2026`                         |
| Pending PM invite — Kamran Shah                 | `/invite/dev-invite-kamran-shah-2026-0001` | chosen on accept                     |

## Folder structure

```
src/
├── app/                          # routes only — pages compose feature views
│   ├── layout.tsx                # Inter, ThemeProvider, StoreProvider, Toaster
│   ├── (public)/                 # login, otp, signup, forgot/reset-password, invite/[token], select-company
│   ├── (company)/                # company shell: dashboard, projects, sales, suppliers-stock, workforce,
│   │                             #   equipment, finance, reports, team, settings  (+ [...rest] → ComingSoon)
│   ├── (project)/projects/[projectId]/   # project shell: overview, planning/*, edit (wizard), [...rest]
│   ├── admin/(auth)/login · admin/(console)/  # platform console
│   ├── suspended/ · not-found.tsx
├── proxy.ts                      # route guard by cookie presence (Next 16 name for middleware)
├── api/
│   ├── endpoints.ts              # EVERY backend path, once
│   ├── baseQuery.ts              # fetchBaseQuery + envelope unwrap + single-flight refresh mutex
│   ├── baseApi.ts · adminBaseApi.ts · tags.ts · transform.ts
│   ├── services/*.api.ts         # one per backend module (+ services/admin/*)
│   ├── generated/schema.ts       # openapi-typescript output (do not edit)
│   └── types/                    # re-exports of generated types + DTOs the spec doesn't describe
├── store/                        # store, typed hooks, StoreProvider, slices (auth, ui, project), error listener
├── components/
│   ├── ui/                       # shadcn primitives (generated)
│   ├── layout/                   # AppShell, TopBar, IconRail, Flyout, StickyFooter, ProjectRailHeader, AdminShell, PageHeader, Breadcrumbs
│   ├── common/                   # DataTable, Pagination, FilterBar, SearchInput, DateRangePicker, StatusBadge, KpiCard, RingKpiCard,
│   │                             #   LineItemsEditor, DocumentHeader, LedgerTable, DifferenceBadge, StockStatusBadge, …
│   └── forms/                    # Form, FormField, TextField, NumberField, MoneyInput, QuantityInput, MaterialPicker, AttachmentField, …
├── features/<module>/            # components/ views/ hooks/ schemas — auth, company, team, subscription,
│                                 #   master-data, clients, projects (wizard/), dashboard, admin, procurement (purchases, POs, stock,
│                                 #   dispatches, shortages, supplier ledger), site (project Site pages)
├── hooks/                        # useListState, useMutationToast, useReadOnly, useSearchFlag
├── lib/                          # money, phone, dates, permissions, apiErrors, navigation, status, options, validation, cn, session
└── i18n/                         # en.ts, roman-ur.ts, useT.ts
tests/unit/ · e2e/
```

## Procurement & Inventory (Phase 1 · Step 6)

| Where                               | Page                                                                                                                                                                                                                                                                                                                                                                                                                      | Who                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Suppliers & Stock → Purchases       | list (supplier / location / payment / status / dates), `…/purchases/new` (store or straight to a site, PO link fills lines, challan / counted / damaged / rate, Udhaar · Cash now · Part now, challan photo, live summary card), `…/purchases/:id` (items, payment + ledger effect, attachments, shortages, corrections, returns; actions **Create return**, **Correction** (Thekedar), **Add rates** for munshi entries) | THEKEDAR, PM                                                                          |
| Purchase Returns · Purchase Orders  | returns list; PO list / detail (ordered vs received) / new / edit / cancel, **Record purchase** from a PO                                                                                                                                                                                                                                                                                                                 | THEKEDAR, PM                                                                          |
| Store Stock                         | KPIs (value, low stock, dispatches on the way), table with average rate / value / low-stock badge, row → movement history; **Dispatch to site**, **Stock count**, **Set low-stock levels**                                                                                                                                                                                                                                | THEKEDAR                                                                              |
| Dispatches · Shortages              | gate passes list / detail / cancel; shortages with **Resolve** (decision cards, note, recovered amount)                                                                                                                                                                                                                                                                                                                   | THEKEDAR (PM reads shortages)                                                         |
| Supplier Ledger · Supplier Payments | suppliers by udhaar + ageing; payments with cheque **Cleared / Bounced**; supplier detail tabs **Info · Agreed Rates · Ledger · Payments**                                                                                                                                                                                                                                                                                | THEKEDAR (PM with rates.view reads)                                                   |
| Dashboard                           | store stock value, supplier udhaar, open shortages, low stock + alerts; **My Approvals** (`/dashboard/approvals`)                                                                                                                                                                                                                                                                                                         | THEKEDAR, PM                                                                          |
| Project → Site                      | **Incoming Material** (badge in the flyout) → **Receive** (blind count, then sent vs counted with `DifferenceBadge`), **Deliveries** (received + owner deliveries, record site purchase), **Material Usage**, **Site Stock**, **Stock Counts & Transfers**                                                                                                                                                                | all roles with project access; MUNSHI never sees rates or values (the API omits them) |

New shared pieces: `LineItemsEditor` (every document's lines), `MaterialPicker`, `QuantityInput` / `QuantityField` (decimal strings, ≤ 3 dp, `lib/quantity.ts` for exact qty × rate), `AttachmentField`, `DifferenceBadge`, `DocumentHeader`, `LedgerTable` (money or quantity running balance), `StockStatusBadge`. Services: `inventory.api.ts`, `procurement.api.ts`, `dispatch.api.ts`.

**E2E munshi sign-in:** `e2e/procurement.spec.ts` gets Rafaqat's SMS code from the backend's dev helper `npm run dev:otp -- <phone>` (in `../construction-platform`, refuses to run in production).

## Labor & Cash Book (Phase 1 · Step 7)

| Where                                      | Page                                                                                                                                                                                                                                                                                                                | Who                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Project → Labor → **Team on Site**         | workers on the site (project rate, "Project rate" badge, today's mark, **Peshgi** / change rate / remove), sub-contracts (**Measure**); **Assign worker** (munshi: default rate only), **Add sub-contract** (office); KPIs hazri today, daily wage bill                                                             | all roles; sub-contract money hidden from MUNSHI |
| Labor → Hazri Register                     | `WeekPicker` + `AttendanceGrid` (tap P → ½ → A, keys F/H/A, arrows, overtime steppers), **Mark today present**, unsaved bar (**Save hazri** posts one bulk call per day), locked-week banner with a link to the settlement, today chips; MUNSHI edits the last 7 days                                               | all roles                                        |
| Labor → Work Measurements · Peshgi         | measurements with **Verify** / **Reject** (comment); peshgi register (outstanding / partly / adjusted) + **Give peshgi** (munshi: site cash only)                                                                                                                                                                   | all roles (verify: office)                       |
| Labor → Weekly Settlements                 | list + **Generate** for a week → detail: KPIs, lines (days, OT, peshgi cut with override ✎, net), `StatusTimeline`, **Recalculate**, **Submit**, **Approve / Return** (comment), **Pay all / Pay selected** (site cash for the munshi)                                                                              | all roles (approve / adjust: office)             |
| Labor → Sub-contractor Accounts            | value, retention, paid, balance due, **Overpaid** badge; **Ledger**, **Progress** (lump sum), **Pay** (running / final / retention), **Deduct** (THEKEDAR)                                                                                                                                                          | THEKEDAR, PM                                     |
| Project → Cash Book                        | **Site Kharcha** (`BalanceCard`, cash book, `CategoryChips` filter, spend-by-category bars, **Add kharcha** incl. urgent material → site stock with `LineItemsEditor`, approvals queue for the office), **Cash Floats** (**Send float**, **Mil gaye** acknowledge), **Top-up Requests**, **Cash Counts & Handover** | all roles (own cash for MUNSHI)                  |
| Finance → Cash Floats Overview             | holders with balance / not received / waiting approval / to pay back / last count, **Send float**, top-ups waiting, kharcha waiting                                                                                                                                                                                 | THEKEDAR                                         |
| Workforce → worker / sub-contractor detail | sites and rates, days this week, peshgi outstanding, wages history · sub-contracts with accounts                                                                                                                                                                                                                    | THEKEDAR, PM                                     |
| Dashboard                                  | **Sites today** KPIs (hazri today, peshgi this week, site kharcha this week, cash with site staff); **My Approvals** adds wages, kharcha, top-ups and measurements to verify                                                                                                                                        | THEKEDAR, PM                                     |
| Team → Members                             | deactivating someone who still holds site cash shows `CASH_BALANCE_OPEN` with the amount and a link to Cash Floats                                                                                                                                                                                                  | THEKEDAR                                         |

New shared pieces: `WeekPicker`, `AttendanceGrid`, `StepperInput`, `ApprovalActions` (return / reject always need a comment), `BalanceCard`, `CategoryChips`, `PayeeSelect`, `StatusTimeline`; `lib/weeks.ts`. Services: `labor.api.ts`, `cashbook.api.ts`. Offline-safe creates send a UUID v7 `clientId` (`newClientId()`).

**E2E:** `e2e/labor-cashbook.spec.ts` creates a small ACTIVE project for the run (Bilal PM, Rafaqat munshi), then: Thekedar float → munshi acknowledges · hazri → site-cash peshgi → generate + submit · PM approves · munshi pays from site cash and the balance drops by peshgi + wages. The project is handed over at the end.

## Billing & Receivables (Phase 1 · Step 8)

Shown only with `billing.view` (THEKEDAR, or a PM with financials — hidden, not greyed, for everyone else).

| Where                                    | Page                                                                                                                                                                                                                                                                                                                                   | Who                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Project → Billing → **Payment Schedule** | `StageTimeline` + stages table: **Mark ready** (proof photos), **Create invoice** (from a ready stage), expected date (owner); amber banner when an earlier stage is unpaid past due. Running-bill projects get a **Progress** tab (sq ft list, **Add progress**, **Bill a period**)                                                   | billing.view                                    |
| Billing → **Invoices & Running Bills**   | list (status / type / date filters, invoiced / received / balance KPIs) + **New invoice** (Stage · Running bill · Recoverable · Retention · Other with manual lines, subtotal preview) → detail (`DocumentHeader`, lines, totals incl. tax, payments; **Edit** / **Delete draft** / **Issue**, **Cancel** with a reason, `PdfActions`) | billing.view (issue / cancel / Other: THEKEDAR) |
| Billing → **Payments Received**          | payments with method icon and cheque status; **Record payment** (cheque fields, WHT when tax is on, slip photo, `AllocationEditor`); **Mark cleared / Bounced** (reason); receipt `PdfActions`                                                                                                                                         | billing.view (cheques: THEKEDAR)                |
| Billing → **Owner Statement**            | date range, opening → invoices / payments (cheque status) → closing, credit, unbilled owner purchases; `PdfActions`                                                                                                                                                                                                                    | billing.view                                    |
| Project Overview                         | `MoneySummaryCards` (contract, invoiced, received, pending cheques, outstanding/overdue, own money invested) + next billable stage                                                                                                                                                                                                     | billing.view                                    |
| Finance → **Receivables**                | per-project table + totals, "Overdue only"; row → project invoices                                                                                                                                                                                                                                                                     | THEKEDAR                                        |
| Dashboard                                | receivables, overdue and billing alerts — now part of the Step 9 overview (below)                                                                                                                                                                                                                                                      | THEKEDAR                                        |
| Sales → Client detail                    | **Statements** tab (per project, `PdfActions`)                                                                                                                                                                                                                                                                                         | billing.view                                    |
| Settings → Alerts & Limits               | payment terms, tax rate + name, "PMs can record owner payments"                                                                                                                                                                                                                                                                        | THEKEDAR                                        |

New shared pieces: `StageTimeline`, `InvoiceStatusBadge` / `ChequeStatusBadge` / `PaymentMethodIcon` (`BillingBadges.tsx`), `AllocationEditor` (auto oldest-first, manual amounts, remainder kept as credit), `MoneySummaryCards`, `PdfActions` (Preview, Download, **WhatsApp** → `https://wa.me/<phone>?text=<message>`), `DocumentPreview`. Service: `billing.api.ts` (payments / cheque status invalidate invoices, payments, receivables, stages and alerts). `BILLING_ACCESS` in `lib/navigation.ts` is the one rule for money screens.

**E2E:** `e2e/billing.spec.ts` creates a small ACTIVE project, marks a stage ready, issues the invoice, records a cheque (pending) and clears it (invoice PAID, receivables move), then bounces a second cheque (balance back, alert on the dashboard). The project is handed over at the end.

## Dashboard, Finance, Reports & Notifications (Phase 1 · Step 9)

Money is shown only with `billing.view` (P&L with `profit.view`); a PM without financials gets the operational version (no money keys come from the API, and no money cards render). A MUNSHI lands on their **site dashboard**.

| Where                                                                                                                                | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Who                                               |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Top bar                                                                                                                              | **NotificationBell** — unread count (polled every 60 s and on window focus; red when something critical is unread), latest 10 grouped by day, mark one / all read, click → its page, "View all"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | everyone                                          |
| Dashboard → **Company Overview**                                                                                                     | `GET /dashboard/overview`: project + date filter (chips Today / This week / This month, default last 30 days); KPI row 1 Active projects (at risk), Pending approvals (→ My Approvals), Open shortages; row 2 rings Receivables (% collected) · Supplier udhaar (% paid, oldest days) · Store stock value (dispatches on the way); cash with site staff, own money invested; Projects summary (contract, billed vs spent bars, received, outstanding / overdue, own money, next stage, status + at risk); Site stats, Labour analysis (wages by worker type, sub-contractors overpaid), Payment analysis (by method, cheques cleared / pending / bounced), Alerts with Open buttons | THEKEDAR, PM (money parts with billing.view)      |
| Dashboard (MUNSHI)                                                                                                                   | **Site dashboard** (`GET /dashboard/site/:projectId`, site switcher when several): today's hazri + **Mark hazri**, material on the way + **Receive**, my cash + **Request top-up** / **Add kharcha**, to-do list, recent usage and own kharcha — no rates or values                                                                                                                                                                                                                                                                                                                                                                                                                 | MUNSHI (PM / owner can open it too)               |
| Dashboard → **My Approvals**                                                                                                         | `GET /approvals` grouped (wages, kharcha, top-ups, measurements, shortages, purchases without rates, stages ready to bill, draft invoices, cheques to clear) with counts and totals; select items → **BulkActionBar** runs the actions they all allow (note / method asked once); each item links to its page; "Nothing waiting for you"                                                                                                                                                                                                                                                                                                                                            | THEKEDAR, PM                                      |
| Dashboard → **Alerts & Notifications**                                                                                               | all my notifications: unread only, severity, type filters, pagination, mark all read                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | everyone                                          |
| Finance → **Receivables**                                                                                                            | Step 8 table + ageing card and an ageing bar per project (0–15 / 16–30 / 31–60 / 60+ days), export                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | THEKEDAR                                          |
| Finance → **Cash Flow Outlook**                                                                                                      | 3 / 6 / 12 months: expected in vs planned out chart, KPIs, month-by-month table (with own money invested after each month) and the **How this is estimated** panel listing the API's assumptions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | THEKEDAR                                          |
| Finance → **Profit & Loss**                                                                                                          | company KPIs (billed, cost, gross profit, margin), billed-vs-cost by month, cost-by-bucket donut, per-project table (6 cost buckets, gross profit, margin, billed vs spent, projected margin "Available after estimates (Phase 2)"); row → **project P&L** (donut, contract, trend)                                                                                                                                                                                                                                                                                                                                                                                                 | THEKEDAR, PM with profit.view (own projects)      |
| Finance → **Cash Floats Overview**                                                                                                   | now from `GET /finance/cash-floats`: holder phone, sites, in hand, spent this week, total floated, last count (difference), top-up asked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | THEKEDAR                                          |
| Reports → **Project Summary · Material Audit · Labor & Peshgi · Cash Book · Supplier Ageing · Receivables Ageing · Stock Valuation** | one generic `ReportView`: `ReportFilterBar` (project / dates where the report uses them), notes, totals, `DataTable` built from the API's columns, **ExportMenu** (CSV / Excel / PDF → signed link opened in a new tab). Delay Analysis stays ComingSoon (needs the schedule)                                                                                                                                                                                                                                                                                                                                                                                                       | per report (`features/reports/reports.config.ts`) |

New shared components: `NotificationBell`, `NotificationList` (grouped by Karachi day, severity icon + label), `ApprovalItem` (type icon, title, project, amount, age, only the API's quick actions; note / method dialog) + `BulkActionBar` (`commonActions`), `ChartCard` + `ChartLegend`, `BarChartCard` / `AreaChartCard` / `DonutChartCard` (recharts on one money axis, 4px rounded bars, 2px surface gaps, legend for ≥ 2 series, exact rupees in tooltips), `AgeingBar` (one hue, older = darker), `ExportMenu`, `ReportFilterBar`, `BarList` (labelled horizontal bars) and `ProgressPair` (% billed vs % spent). Chart colours are the validated `--chart-1 … --chart-6` and `--age-1 … --age-4` tokens in `globals.css` (light and dark).

Services: `notifications.api.ts` (`UNREAD_POLL_MS`), `approvals.api.ts` (bulk invalidates every module it touches), `dashboard.api.ts`, `finance.api.ts`, `reports.api.ts` (JSON query + export mutation). Types in `src/api/types/dashboard.ts`. The old Step 6–8 dashboard widgets and the labour section on the Shortages page are replaced by the overview and My Approvals.

**E2E:** `e2e/dashboard.spec.ts` creates a small project with a kharcha above the company limit, a sub-contract measurement and a bounced cheque (through the API), checks the dashboard KPIs, bulk-approves the kharcha and the measurement in My Approvals (the pending count drops by 2), exports Supplier Ageing as Excel (signed link returned) and marks the bounced-cheque notification read from the bell (count drops by 1). It cancels the invoice and hands the project over at the end.

## Daily Logs & the Munshi app (Phase 1 · Step 10)

Site entries now also come from the **Munshi phone app** (`../construction-mobile`), which works offline and syncs later (`/sync/push`, `/sync/pull`). The web is read-only for these logs.

| Where                                                                                         | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Who                     |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Project → Site → **Daily Logs & Photos** (`/projects/:id/site/daily-logs`)                    | `GET /projects/:id/daily-logs` with a date range (default last 14 days), grouped by day: author, site conditions, work done, note, photo gallery (thumbnails → full-size lightbox with next / previous), voice-note player, **📱 late sync** badge with "written on the phone … / reached the office …". **Day summary** (`GET /daily-logs/:id`) slide-over: hazri present / half / absent, material used, kharcha of that day (a munshi sees only his own) | everyone on the project |
| Team → **Devices**                                                                            | adds `GET /sync/status`: pending uploads (amber when > 0) and **Last rejected** — the latest refused entry's code (+N more) → slide-over listing each refused entry (type in office words, code, message, made on the phone / received)                                                                                                                                                                                                                     | THEKEDAR                |
| Hazri (grid and today), Kharcha entries, Purchases list + detail, Dispatch (gate pass) detail | **📱 late sync** badge / marker (`LateSyncBadge`, title explains it) when the API sends `lateSync: true` — the entry reached the server more than 48 h after it was made on a phone                                                                                                                                                                                                                                                                         | as before               |

New: `components/common/LateSyncBadge.tsx`, `features/site/DailyLogsView.tsx`, `api/services/dailyLogs.api.ts` (`getDailyLogs`, `getDailyLog`, `getSyncStatus`; tags `DailyLogs`, `SyncStatus`), `api/types/sync.ts`, endpoints `ENDPOINTS.dailyLogs.*` and `ENDPOINTS.sync.status`. `lateSync?: boolean` was added to `AttendanceMark`, today's hazri rows, `CashEntry`, `Purchase`, `PurchaseListRow` and `Dispatch`. Navigation: _Daily Logs & Photos_ is now available. API types regenerated (`npm run api:types`).

## Super admin: Company data

Platform console → **Company Data** (`/admin/data`): pick a company in the bar at the top and work in **that company's own screens** — Dashboard, Projects (and inside a project: Planning, Site, Labor, Cash Book, Billing), Sales, Suppliers & Stock, Workforce, Finance, Reports, Team, Settings — to view, add, edit and delete. **Exit** leaves the company. Company detail (`/admin/companies/:id`) also has read-only tabs: Projects, Team & devices, Activity & money.

How it works:

- `/admin/data/<company path>` renders the company app's page for `<company path>` (`app/admin/(console)/data/[[...path]]`). The list of pages is generated: run `npm run routes:company` after adding or moving a page under `(company)` or `(project)` (a unit test fails when it is out of date).
- The chosen company is the `act_as_tenant` cookie (`lib/actingCompany.ts`). While it is set (and the admin is signed in), the company API sends `X-Act-As-Tenant` with the admin's session and refreshes through the admin refresh endpoint; the proxy sends company links (`/projects/…`) to `/admin/data/…`, so every page's own links stay in the console.
- Switching company or exiting clears the company cache, so one company's data never shows in another. Admin logout clears the choice too.
- Changes are made as the company's hidden "Super Admin (Platform)" user and logged with the admin's name (see the backend README).

## Rules of the codebase

1. **Reusable components.** Any UI pattern used twice or more lives in `src/components`
   (`layout` / `common` / `forms`) or in a feature's `components/`. Pages only compose components —
   no copy-pasted markup. Before writing a table, card, dialog or field, look there first.
2. **Server data only in RTK Query.** Slices hold client state (session snapshot, UI, current project).
3. **API paths live in `src/api/endpoints.ts` only.** ESLint rejects a literal `/api/v1/…` anywhere else.
4. **Types come from the backend's OpenAPI document** (`npm run api:types`). Where the document has no
   response schema yet, the shape is written once in `src/api/types/*` from the backend DTOs.
5. **Money is paisa strings.** Use `lib/money.ts` (`formatPKR`, `formatPKRShort`, `rupeesToPaisa`,
   `paisaToRupees`) and `MoneyInput` / `MoneyText`. Never `Number()` a contract value.
6. **Permissions hide, never disable.** `PermissionGate`, `useCan`, `RequireAccess`; omitted financial
   fields render `HiddenForRole`.
7. **Every list** has skeleton / empty / error states; **every mutation** toasts (`useMutationToast`);
   **every destructive action** goes through `ConfirmDialog`.

## Adding a backend endpoint

1. **Path** → `src/api/endpoints.ts`
   ```ts
   projects: { …, photos: (projectId: string) => `/projects/${id(projectId)}/photos` },
   ```
2. **Types** → run `npm run api:types` (backend running). If the response has a schema, alias it in
   `src/api/types/*.ts` with `ResponseData<"/api/v1/projects/{id}/photos", "get">`; request bodies with
   `RequestBody<…>`. Otherwise add an interface next to the module's other DTOs.
3. **Service** → add to the module's `src/api/services/*.api.ts` with `injectEndpoints`, using tags from
   `src/api/tags.ts` (lists provide `{type, id: "LIST"}` + one tag per row; mutations invalidate the row
   and `LIST`). Export the generated hook.
4. **Hook** → use it in a feature view; wrap writes in `useMutationToast` for the toast / field errors.
5. **Menu** → add or switch `available: true` on the item in `src/lib/navigation.ts`.

## Regenerating API types

```powershell
cd ..\construction-platform; npm run dev     # docs at http://localhost:4000/api/docs.json
cd ..\construction-web; npm run api:types    # writes src/api/generated/schema.ts
npm run typecheck
```

## Auth in short

- Web sign-in uses the backend's cookies (`client: "web"`); nothing is stored in localStorage.
- `proxy.ts` only checks that a cookie exists. The shells call `GET /auth/me` (or `/admin/auth/me`).
- A 401 triggers **one** `POST /auth/refresh` behind a mutex; parallel requests wait and retry. A failed
  refresh or a revoked session sends the user to `/login?next=…`, where a silent `/auth/me` signs them
  straight back in if the refresh cookie is still valid.
- `PLAN_LIMIT_REACHED` opens the upgrade dialog, `ACCOUNT_READ_ONLY` shows the read-only banner and
  `COMPANY_SUSPENDED` goes to `/suspended` — app-wide, from `store/errorListener.ts`.
