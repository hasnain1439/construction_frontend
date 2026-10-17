# FRONTEND_SPEC — Construction Management Platform (Next.js web app)

## ROLE & GOAL
You are a Principal Frontend Engineer. Build the Next.js web app for a multi-tenant Construction Management SaaS (Pakistani building contractors) on top of an EXISTING backend. Only build screens for features the backend already has (Phase 1 Steps 1–5). Work through the parts IN ORDER; after EACH part run `npm run lint`, `npm run typecheck`, `npm run build` and `npm test` and fix failures before moving on. Do not stop between parts unless something blocks you. Finish with one summary.

## LOCATIONS
- Backend (do NOT modify): `D:\metaviz\Saas_product\construction-platform` — Express API on http://localhost:4000, base path `/api/v1`. Read its `README.md` and `docs/PROJECT_CONTEXT.md` to learn every endpoint, request/response shape, error code and seed account. Swagger JSON: http://localhost:4000/api/docs.json.
- Frontend (this repo): `D:\metaviz\Saas_product\construction-web`. Windows + PowerShell commands.
- Design source of truth: `docs/design-brief.md` in this repo. Follow its visual style, app shell, navigation (rail + flyout items) and page layouts. Where it describes modules the backend doesn't have yet, show the menu item but open a "Coming in the next phase" page (no dead clicks, no fake data).

## STACK (latest STABLE versions at install time; pin exact versions in package.json)
- Next.js (App Router, TypeScript strict, `src/` directory), font Inter via `next/font`.
- Tailwind CSS + shadcn/ui (Radix primitives) + lucide-react icons.
- Redux Toolkit + RTK Query.
- React Hook Form + Zod + @hookform/resolvers.
- date-fns (+ date-fns-tz for Asia/Karachi), sonner (toasts), clsx + tailwind-merge, async-mutex.
- openapi-typescript (generate API types from the backend Swagger JSON).
- recharts (admin charts only).
- Vitest + React Testing Library (unit/component), Playwright (smoke e2e).
- ESLint + Prettier.
- i18n: a small typed dictionary (`src/i18n/en.ts`, `src/i18n/roman-ur.ts`, `useT()` hook) — no i18n library.

## NON-NEGOTIABLE RULES
1. **Reusable components:** any UI pattern used 2 or more times MUST be a shared component in `src/components` (layout / common / forms). No copy-pasted markup. Pages only compose components.
2. **Redux:** Redux Toolkit store + RTK Query for ALL server data. Never copy server data into slices. Slices only for client state (auth session snapshot, UI, current project, wizard draft).
3. **API folder:** every endpoint path is defined ONCE in `src/api/endpoints.ts` and exported. Every RTK Query service in `src/api/services/*.api.ts` imports paths from there and exports hooks. No hard-coded URL strings anywhere else.
4. **Types:** `npm run api:types` runs openapi-typescript against http://localhost:4000/api/docs.json → `src/api/generated/schema.ts`. Request/response types come from the generated file (re-exported from `src/api/types`). Do not hand-write duplicates.
5. **Auth via cookies:** web uses the backend's httpOnly cookies. Proxy the API through Next.js rewrites (`/api/v1/:path*` → `${API_ORIGIN}/api/v1/:path*`) so cookies are first-party. RTK Query baseUrl = `/api/v1`, `credentials: "include"`. Never store tokens in localStorage.
6. **Refresh:** on 401 call `POST /auth/refresh` ONCE using a mutex (async-mutex) so parallel requests never refresh in parallel (the backend treats parallel refresh as token reuse), then retry. If refresh fails → clear session, redirect to `/login`. Platform admin uses `/admin/auth/refresh` the same way.
7. **Permissions:** load `GET /auth/me` after login. Hide (don't disable) menu items, buttons and fields the user may not use. Financial fields are absent in API responses for a PM without `billing.view` — the UI must handle missing fields with a subtle "Hidden for your role" placeholder.
8. **Money:** API sends paisa as strings. Shared helpers in `src/lib/money.ts`: `formatPKR(paisa)` → "Rs 1,85,00,000" (South Asian grouping), `formatPKRShort(paisa)` → "Rs 1.85 Cr" / "Rs 14.7 L", `rupeesToPaisa`, `paisaToRupees` (BigInt-safe). `MoneyInput` edits rupees and emits paisa strings.
9. **Errors:** backend shape `{ success:false, error:{ code, message, details? } }`. `src/lib/apiErrors.ts` maps codes to friendly messages (English + Roman Urdu) and maps `VALIDATION_ERROR` `details.fields` onto React Hook Form fields. Special handling: `ACCOUNT_READ_ONLY` → read-only banner; `PLAN_LIMIT_REACHED` (402) → upgrade dialog linking to Subscription; `COMPANY_SUSPENDED` → suspended page; `ACCOUNT_LOCKED` (423) → show retry time.
10. **Phones:** shared `PhoneInput` (+92 format) and `normalisePhone` matching the backend rules.
11. **i18n:** English + Roman Urdu for navigation and common UI, language toggle in the top bar.
12. Every list: loading skeleton, empty state, error state. Every mutation: toast. Destructive actions: confirm dialog.
13. No mock data in pages — use the backend seed data. Accessibility: labels on inputs, keyboard-navigable dialogs, visible focus.

## DESIGN TOKENS (full detail in docs/design-brief.md)
- Font Inter. Body 14px (never below 12px). Page title 24px semibold. Card/section title 16px semibold. KPI numbers 30px semibold.
- Background #F5F6FA. Cards white, radius 12px, soft shadow. Borders #E2E8F0. 8px spacing grid.
- Primary #2563EB · Accent amber #F59E0B · Success #059669 · Warning #D97706 · Danger #DC2626 · Neutral #94A3B8 · Text #0F172A · Muted text #64748B.
- Icon rail white; active item = blue text + 4px blue left bar; only the active item is highlighted.
- Pill-shaped buttons. Status = colour + icon + label, never colour alone.
- Light + dark mode (Tailwind class strategy, CSS variables in `globals.css`, shadcn theme mapped to these tokens).

## ROLES (from backend)
- THEKEDAR (company owner): every permission key in the company; cannot be limited.
- PM (office account) and MUNSHI (site account, phone OTP): what they may do comes only from **permission keys** in `/auth/me` (`permissions`, `permissionRoles[]`) — role templates (Administrator, Project Manager, Munshi, Accountant, Store Keeper, or custom) plus per-user ALLOW / DENY overrides. The web never decides on the account role; `canAccess()` in `src/lib/permissions.ts` checks keys (`P`, `ANY`, `ALL` helpers in `navigation.ts`).
- Field permissions decide which money appears at all: `fields.rates` (rates, purchase / stock values), `fields.amounts` (billing money), `fields.profit` (P&L, margins), `fields.contract` (contract value, price). The API leaves the keys out; screens must render "—" / hide the column, never `0`.
- Scope: a grant is ASSIGNED_PROJECTS or ALL_PROJECTS; a project outside the scope answers 404 (show the not-found page, not an error toast).
- PLATFORM_ADMIN: separate `/admin` console, separate login and tokens.

## NAVIGATION (put in `src/lib/navigation.ts`; drives IconRail, Flyout and CommandSearch)
Each item: id, label (en + roman-ur + urdu), icon, href, `access` (permission rule; hides the item), `available` (false → ComingSoon page). Everything below is available unless marked ComingSoon.

**Company mode rail → flyout items**
- Dashboard → Company Overview (a MUNSHI gets the Site Dashboard) · My Approvals · Alerts & Notifications
- Projects → All Projects · New Project · Closed & Archived
- Sales → Clients (Owners) · Quote Pipeline (board + table) · New Quote (inputs | live internal + customer view) · Win / Loss Insights — `sales.quote.*` (Step 12)
- Suppliers & Stock → All Suppliers · Purchases · Purchase Returns · Store Stock · Dispatches (Sent to Sites) · Shortages · Supplier Ledger · Purchase Orders · Supplier Payments
- Workforce → Workers Directory · Worker Types · Sub-contractors
- Equipment → Allocation Map · Owned Equipment · Rentals · Movements · Loss & Damage · Hire & Rent Charges · Shuttering Demand — `equipment.*` (Step 16)
- Finance → Receivables (+ ageing) · Cash Flow Outlook · Profit & Loss (projected margin from Step 14) · Cash Floats Overview
- Reports → Project Summary · Material Audit · Labor & Advances · Cash Book · Supplier Ageing · Receivables Ageing · Stock Valuation · Delay Analysis · Variance Report · Change Order Register · Equipment Utilisation · Snag Summary (Step 18; each with a project picker that opens the per-project book) · WHT Summary · Tax-wise Invoice Register (`tax.view` + `fields.amounts`) — every report exports CSV / Excel / PDF
- Team → Members · Invitations · Devices · Roles & Permissions
- Settings → Company Profile · Opening Balances · Materials · Price List · Labor Rates · Rulebook (company overrides) · Payment Templates · Holidays · Audit Log · Alerts & Limits (incl. control thresholds, idle-equipment days, Ramadan) · Tax (Step 18) · Subscription

**Project mode rail → flyout items** (top of rail: "← All projects", project name + status badge)
- Overview → Project Summary (revised contract, revised end date, change orders)
- Planning → Site Setup · Floors & Rooms · Supply Split · Estimate (BoQ) · Estimate Revisions · Owner Shopping List — Step 11
- Schedule → Gantt · Milestones & Quotas · Stoppage Days · Plan Versions — Step 13
- Site → Daily Logs & Photos · Incoming Material · Deliveries · Material Usage (optional milestone) · Site Stock · Stock Counts & Transfers · Equipment on Site
- Labor → Team on Site · Attendance Register · Sub-contractor Accounts · Work Measurements · Advances · Weekly Settlements
- Cash Book → Site Expenses · Cash Floats · Top-up Requests · Cash Counts & Handover
- Change Orders → All Change Orders · New Change Order · Site Instructions — Step 15
- Billing → Payment Schedule · Invoices & Running Bills (tax card + preview when tax is on) · Payments Received (WHT, certificate) · Owner Statement
- Control → Material Variance · Cost Variance · Burn Rate vs Progress · Delay Analysis — Step 14
- Documents & Closeout → Drawings · Snag List · Handover · Retention — Step 17

**Super Admin console rail**
Overview · Companies · Company Data · Payments (badge = pending count) · Plans · Material Catalog · Holiday Calendar · Audit Logs · Rulebook (versions) · Communication (ComingSoon) · Security (ComingSoon)

## FOLDER STRUCTURE (create exactly this shape)
```
construction-web/
├── docs/ FRONTEND_SPEC.md  design-brief.md
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # fonts, ThemeProvider, StoreProvider, Toaster
│   │   ├── (public)/                       # login, otp, signup, forgot-password, reset-password, invite/[token], select-company
│   │   ├── (company)/                      # company mode shell (top bar, icon rail, flyout, sticky footer)
│   │   │   ├── dashboard/ projects/ sales/ suppliers-stock/ workforce/
│   │   │   ├── equipment/ finance/ reports/ team/ settings/
│   │   ├── (project)/projects/[projectId]/ # project mode shell (rail switches)
│   │   │   ├── overview/ planning/{site-setup,floors-rooms,supply-split,estimate}/ …ComingSoon routes
│   │   ├── admin/(auth)/login/
│   │   ├── admin/(console)/                # super admin shell
│   │   │   ├── overview/ companies/ payments/ plans/ materials/ holidays/ audit-logs/
│   │   ├── suspended/
│   │   └── not-found.tsx
│   ├── api/
│   │   ├── endpoints.ts                    # ALL paths, exported (e.g. ENDPOINTS.projects.byId(id))
│   │   ├── baseApi.ts                      # createApi, fetchBaseQuery, reauth mutex, tagTypes
│   │   ├── adminBaseApi.ts                 # same for platform admin
│   │   ├── services/                       # one file per backend module; injectEndpoints; export hooks
│   │   │   ├── auth.api.ts company.api.ts team.api.ts attachments.api.ts
│   │   │   ├── subscription.api.ts clients.api.ts projects.api.ts masterData.api.ts
│   │   │   └── admin/*.api.ts
│   │   ├── generated/schema.ts             # openapi-typescript output
│   │   └── types/                          # re-exports + helpers (Paginated<T>, ApiError)
│   ├── store/
│   │   ├── index.ts hooks.ts StoreProvider.tsx
│   │   └── slices/ authSlice.ts uiSlice.ts projectSlice.ts
│   ├── components/
│   │   ├── ui/        # shadcn primitives
│   │   ├── layout/    # AppShell, TopBar, IconRail, Flyout, StickyFooter, ProjectRailHeader, AdminShell, PageHeader, Breadcrumbs
│   │   ├── common/    # DataTable, Pagination, FilterBar, SearchInput, DateRangePicker, StatusBadge, KpiCard, RingKpiCard,
│   │   │              # EmptyState, ErrorState, TableSkeleton, ConfirmDialog, SlideOver, MoneyText, HiddenForRole,
│   │   │              # PermissionGate, ReadOnlyBanner, PlanLimitDialog, ComingSoon, FileUpload, AvatarName,
│   │   │              # LanguageToggle, ThemeToggle, CommandSearch, StepTabs, InlineEditCell, UsageBar
│   │   └── forms/     # FormField, TextField, NumberField (unit suffix), MoneyInput, PhoneInput, SelectField,
│   │                  # ComboboxField, DateField, ToggleField, SegmentedField, RadioCards, TextareaField, FormActions
│   ├── features/      # per module: components/ hooks/ schemas/ utils/
│   │   ├── auth/ company/ team/ subscription/ clients/ projects/ master-data/ admin/
│   ├── lib/  money.ts phone.ts dates.ts permissions.ts apiErrors.ts cn.ts navigation.ts
│   ├── i18n/ en.ts roman-ur.ts useT.ts
│   └── middleware.ts  # no session cookie → /login; /admin without admin cookie → /admin/login
├── tests/ (unit) · e2e/ (Playwright)
├── .env.local.example   # API_ORIGIN=http://localhost:4000
└── next.config.ts       # rewrites
```

---

## PART 1 — Foundation
- Create the project in this folder, install the stack, configure Tailwind tokens, shadcn, ESLint/Prettier, Vitest, Playwright, path alias `@/`.
- next.config rewrites; `.env.local.example`; `npm run api:types`; generate types (backend must be running).
- `src/api/endpoints.ts` with every Phase 1 endpoint: auth, admin auth, attachments, company, settings, holidays, users, invitations, devices, subscription, clients, projects (+ wizard sections, team, floors/rooms/openings, copy floor, review, activate, status), master data (material-groups, materials, quality-categories, price-list + bulk-percent + history, labor-rates, payment-templates, suppliers + rates, workers, subcontractors, supply-presets), admin (overview, health, tenants, payments, plans, holidays, audit-logs, material catalog).
- baseApi + adminBaseApi with the reauth mutex, tagTypes and provides/invalidates conventions.
- Store, StoreProvider, typed hooks, authSlice (me snapshot), uiSlice (rail/flyout open, theme, language), projectSlice (current project id).
- lib helpers (money, phone, dates in Asia/Karachi, permissions, apiErrors) with unit tests.
Tests: money formatting (crore/lakh), rupee↔paisa, phone normalisation, apiErrors mapping, reauth mutex (one refresh for 3 parallel 401s).

## PART 2 — Shared components + shells
- Every component listed under components/layout, common and forms, built on shadcn, themed with the tokens, light/dark.
- AppShell (company mode): top bar (hamburger, search button + "Search menu…" opening CommandSearch, language toggle, centered company logo/name, "+ Create" menu, theme toggle, notifications bell placeholder, user menu with logout and Sessions), icon rail (icon over label, only the active item highlighted), flyout (opens beside rail; closes on navigate, Esc or outside click), sticky footer (quick actions that exist: New Project, Invite Member; version text; static "All synced" pill).
- Project mode shell: rail switches to project items with "← All projects", project name + status badge.
- AdminShell for /admin with neutral platform branding.
- ReadOnlyBanner, PlanLimitDialog, HiddenForRole, PermissionGate, ComingSoon page.
Tests: DataTable (sorting, pagination, empty), PermissionGate hides content, IconRail highlights only the active item, MoneyInput emits paisa.

## PART 3 — Auth screens
Login (tabs: email/phone + password, Phone OTP), OTP verify (6 boxes, countdown, resend after 60 s), select-company (on 409 MULTIPLE_COMPANIES → choose, resend with tenantId), signup (company + owner + region + marla standard), forgot/reset password, accept invitation (PM sets password; Munshi → OTP), suspended page, admin login. Locked account (423) shows retry time. After login load /auth/me → /dashboard (or /admin/overview). middleware.ts guards routes by cookie presence; real check via /auth/me in the shell.
E2E smoke: Khalid (Thekedar) logs in → dashboard; Bilal (PM) logs in → no Team / Settings / Finance in the rail.

## PART 4 — Company, Team, Subscription
- Settings → Company Profile (logo upload via FileUpload → POST /attachments kind LOGO → PATCH /company), Alerts & Limits (company settings form with ranges), Holidays (merged list, add/delete company holiday).
- Team → Members (DataTable, filters, usage hint, Edit member SlideOver: projects, role, financials, deactivate/reactivate with confirm and API error messages), Invitations (invite SlideOver, resend, cancel, statuses), Devices (log out device with confirm; current device marked).
- Settings → Subscription: plan card, usage bars, plans comparison, Upload payment slip SlideOver (FileUpload kind PAYMENT_SLIP + form), payment history, change plan flow (downgrade chooses projects to keep), cancel pending change. Read-only banner works.
- Dashboard (company overview) using ONLY real data available now: projects count by status, team usage, subscription status/days left, recent projects table, quick actions. Other KPI areas show ComingSoon cards.

## PART 5 — Master data
- Settings → Materials: grouped table, search, show-hidden toggle, add/edit material SlideOver, hide/show, delete with MATERIAL_IN_USE message.
- Settings → Price List: category tabs (+ add category dialog with copy rates; rename / duplicate / archive / set default menu), table with inline rate + specification editing (batch save via PUT /price-list), bulk % dialog, rate history SlideOver. MUNSHI never sees this page.
- Settings → Labor Rates (daily and sub-contract tables, edit and save), Payment Templates (list, editor with live total chip "100% ✓", retention flag, default).
- Suppliers & Stock → All Suppliers (list, add/edit, activate/deactivate, detail with agreed-rates editor + history).
- Workforce → Workers and Sub-contractors (lists, add/edit, activate/deactivate).

## PART 6 — Clients + Projects
- Sales → Clients (list, add/edit, detail with projects).
- Projects → All Projects (cards/table toggle, filters), Closed & Archived.
- New Project = FULL PAGE with 6 numbered tabs:
  1. Basic Info (POST /projects, then PATCH basic; team assignment for Thekedar via PUT team)
  2. Contract & Supply (preset cards, supply table with Contractor/Owner toggle + quality category, contract value or rate per sq ft with live total, billing model, payment schedule editor or template with live "100% ✓" chip, retention, defect period)
  3. Plot & Structure (plot unit/size/marla/front/depth with live area result and warning, structure cards, basement + height, floors builder)
  4. Coverage & Boundary
  5. Floors & Rooms (floor sub-tabs, room cards with openings mini-table, live floor/wall/net-wall numbers using the same formulas as the backend, Copy floor, add/remove)
  6. Review (GET /projects/:id/review → errors/warnings/summary; Activate button; PLAN_LIMIT_REACHED → PlanLimitDialog)
  Next/Back, green check on completed tabs (wizardCompletedSteps), red dot on tabs with errors, "Save as draft". Editing an existing project opens any tab directly.
- Project mode: Overview (client, contract (permission-aware), plot, structure, coverage, team, rooms summary, status actions for Thekedar with allowed transitions), Planning → Site Setup (read-only cards + Edit → wizard tab), Floors & Rooms, Supply Split. Everything else → ComingSoon.
- Locked projects (READ_ONLY, HANDED_OVER, CLOSED) render forms read-only with a banner.
E2E smoke: Thekedar creates a project through all 6 tabs and activates it; it appears in All Projects.

## PART 7 — Super Admin console
/admin: Overview (KPIs, plan distribution, revenue-by-month chart with recharts), Companies (list + filters, detail, Create company SlideOver with TRIAL/PAID, status actions with notes, change plan), Payments (queue with duplicate warning, detail SlideOver with slip preview, approve, reject with reason), Plans (list/create/edit), Holidays, Audit Logs (filters), Material Catalog (groups, materials, add/edit, push to tenants).

## PART 8 — Finish
- README: setup, env, scripts, folder structure, the reusable-component rule, how to add a new endpoint (endpoints.ts → service → hook), how to regenerate API types, seed accounts for login.
- Final checks: lint, typecheck, build, unit tests, Playwright smoke (backend running).

## PART 9 — Phase 2 + 3 screens (built)
- **Estimate (Step 11)**: BoQ by section with traces (rate-free without `fields.rates`), revisions (generate / regenerate / line override / approve / compare, "rates outdated" banner), owner shopping list (never money), BoQ + shopping-list PDFs.
- **Sales (Step 12)**: pipeline board, quote detail (revisions compare, activity, send with WhatsApp text, lost reason, won → `/projects/new?id=…&tab=5`), insights.
- **Schedule (Step 13)**: Gantt from the approved estimate, milestones & quotas, stoppage days (approve / reject), plan versions, delay breakdown.
- **Control (Step 14)**: variance tables + charts, burn rate vs progress chart, delay analysis, control alerts on the dashboard.
- **Change orders (Step 15)**: builder (mini BoQ, markup, days impact, affected milestones), status flow with proof, slip PDF + WhatsApp, site instructions → CO.
- **Equipment (Step 16)**: ledger views, transfers with counted receiving, rentals, losses, charges, shuttering demand planner, idle rented equipment panel.
- **Closeout (Step 17)**: drawings with revisions, snag list with photos and cost attribution, handover checklist + owner sign-off + certificate PDF, retention.
- **Polish (Step 18)**: every Phase 2 / 3 page — and, since the QA fixes, the Phase 1 site, labour and cash pages — checks its own permission with the same key as its menu item (a unit test walks the whole menu: every link opens a real page with a matching gate); empty states with a create action only when the user may create (change orders, quotes, equipment, rentals); control pages without a schedule / approved estimate link to the Gantt / estimate; the setup checklist shows optional next steps (rulebook values, first quote, equipment, tax settings); only Admin → Communication and Security remain ComingSoon.
- **Reports + tax (Step 18)**: five new reports + per-project books, WHT summary, tax-wise invoice register, Settings → Tax, project tax override, invoice tax line, payment WHT certificate.

## PART 10 — PDFs (all produced by the API)
- The web never builds PDFs: it calls the endpoint and opens / shares the signed link from `{ url, expiresAt, whatsappText, clientPhone }` (reports: `{ url, expiresAt, format, mimeType }`). Pass `?lang=en|roman|ur` from the language picker when the user chooses one; otherwise the API uses the user's own language.
- Every PDF has the same letterhead (logo, company name, address, phone, NTN — STRN on tax reports — document title, number, date), A4 margins and a footer with the generated-on date and "Page X of Y". Urdu PDFs are right-to-left with an embedded Nastaliq font.
- Owner-facing PDFs (customer quotation, change order slip, invoice, receipt, owner statement, handover certificate, owner shopping list) never contain costs, overheads, contingency, margins or markups — safe to share on WhatsApp. Internal PDFs (quote costing and estimate BoQ — both printed "Internal document — not for the client" — and report files) must not be offered as a WhatsApp share to the owner.
- A missing PDF engine answers `503 PDF_UNAVAILABLE` — show "PDF can't be made right now, try again in a minute" and keep the screen usable.
- Company logo, address, phone and NTN come from Settings → Company Profile, STRN from Settings → Tax: the empty-state hint on those pages should say they appear on every PDF.

## SEED ACCOUNTS (from backend)
- Thekedar: +923001234567 / Thekedar#2026 (Malik & Sons Builders)
- PM: +923331112233 / Bilal#2026
- Munshi: +923211234567 (OTP only — code printed in backend console)
- Super Admin: admin@platform.local / Admin#2026

## FINAL REPLY
One summary: pages built, shared components list, API services and endpoint count, test counts, how to run, every assumption made, and anything that needs backend changes (list only — do not change the backend).
