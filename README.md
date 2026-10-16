# Construction Platform — Web

Next.js web app for the multi-tenant Construction Management SaaS (Pakistani building contractors).
It talks to the Express API in `../construction-platform` and only builds screens for what that
backend already does (Phase 1, steps 1–10). Everything else in the menu opens a
"Coming in the next phase" page. What changed and when: [CHANGELOG.md](CHANGELOG.md). Docker / deployment: [Deployment](#deployment-docker-cicd).

**Stack** — Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5.9 (strict) · Tailwind CSS 4 ·
shadcn/ui (Radix) · lucide-react · Redux Toolkit + RTK Query · React Hook Form + Zod · date-fns(-tz) ·
sonner · recharts · next-themes · Vitest + Testing Library · Playwright · ESLint + Prettier.

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
| `API_PUBLIC_URL`          | `API_ORIGIN`            | Optional: origin of signed file links, allowed in the CSP. |
| `NEXT_PUBLIC_SENTRY_DSN`  | empty (off)             | Optional: Sentry for the browser and the Next.js server. See [Observability](#observability). |
| `SENTRY_DSN`              | `NEXT_PUBLIC_SENTRY_DSN` | Optional: server-only DSN override. |
| `NEXT_PUBLIC_POSTHOG_KEY` | empty (off)             | Optional: PostHog project key (`login` event only). |
| `NEXT_PUBLIC_POSTHOG_HOST`| `https://us.i.posthog.com` | Optional: PostHog host. |

The browser never calls the API origin directly. `next.config.ts` rewrites `/api/v1/:path*` to
`${API_ORIGIN}/api/v1/:path*`, so the backend's httpOnly cookies (`access_token`, `refresh_token`,
`admin_*`) are first-party and no CORS is involved.

## Scripts

| Script                            | What it does                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server on :3000                                                                                                                                   |
| `npm run build` / `npm start`     | Production build / serve it                                                                                                                           |
| `npm run lint`                    | ESLint (0 warnings allowed)                                                                                                                           |
| `npm run typecheck`               | `next typegen` + `tsc --noEmit`                                                                                                                       |
| `npm test` / `npm run test:watch` | Vitest unit + component tests (`tests/unit/`)                                                                                                         |
| `npm run e2e`                     | Playwright smoke tests (`e2e/`) — needs the backend running; starts `next start` (run `npm run build` first) or reuses a server on :3000              |
| `npm run api:types`               | Regenerates `src/api/generated/schema.ts` from the running backend's `/api/docs.json` (`API_ORIGIN`, default :4000)                                   |
| `npm run routes:company`          | Regenerates `src/lib/companyRoutes.generated.ts` (pages the super admin's Company data can open); run after adding or moving a company / project page |
| `npm run format` / `format:check` | Prettier write / check                                                                                                                                |

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
│   ├── layout.tsx                # Cabin + Noto Nastaliq Urdu fonts, ThemeProvider, StoreProvider, Toaster
│   ├── globals.css               # design tokens (cabin palette, chart colours, glass), light + dark
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
│   ├── layout/                   # AppShell, TopBar, IconRail, Flyout, StickyFooter, ProjectRailHeader, AdminShell, AdminRail,
│   │                             #   PageHeader, Breadcrumbs, navDrawer (rail ↔ drawer below lg)
│   ├── common/                   # DataTable, Pagination, FilterBar, SearchInput, DateRangePicker, StatusBadge, KpiCard, RingKpiCard,
│   │                             #   RowActions, ShareColumns, Charts, InviteShare, LanguageMenu, LineItemsEditor, LedgerTable, …
│   └── forms/                    # Form, FormField, TextField, NumberField, MoneyInput, QuantityInput, CheckboxField, MaterialPicker, …
├── features/<module>/            # components/ views/ hooks/ schemas — auth, company, team, subscription,
│                                 #   master-data, clients, projects (wizard/), dashboard, admin, procurement (purchases, POs, stock,
│                                 #   dispatches, shortages, supplier ledger), site, labor, cashbook, billing, finance, reports
├── hooks/                        # useListState, useMutationToast, useReadOnly, useSearchFlag
├── lib/                          # money, phone, dates, permissions, apiErrors, navigation, status, options, validation, cn, session
└── i18n/                         # en.ts, roman-ur.ts, ur.ts, useT.ts (see Languages)
tests/unit/ · e2e/
```

## Design system

- **Warm "cabin" palette** — tokens in `src/app/globals.css`: `sand` `#B5A18B`, `sun` `#FFCF68` (+ `sun-soft`),
  `stone` `#E4E0E0`, `charcoal` `#201F1E` (Tailwind: `bg-sand`, `text-charcoal`, …). Charcoal is the light-mode
  primary; sand is the dark-mode primary; sun highlights the one thing that matters.
- **Font** — Cabin (`next/font`) for everything; Noto Nastaliq Urdu only when Urdu is chosen (Latin text and numbers stay in Cabin).
- **Glass cards** — the `glass` utility (translucent, blurred, light edge) on a warm gradient background.
- **Light / dark** — `ThemeToggle` (next-themes `dark` class); every token is redefined for dark in `globals.css`.
- **Charts** — validated categorical palette `--chart-1 … --chart-6`, **teal first** (rings and the first series),
  `--chart-brand` (sand) for single-series charts, `--age-1 … --age-4` for ageing. Always with a legend or labels.

## Languages (English · Roman Urdu · Urdu)

The whole company app is in three languages; the platform admin console (`/admin`) stays English.

- **Picking** — `LanguageMenu` (top bar; user menu on phones). The choice is kept in this browser (`cw.ui` +
  `cw.languageChosen` in localStorage) and saved on the account with `PATCH /auth/me/preferences { language }`
  (`useChangeLanguage`). After sign-in, the account's language (`/auth/me` → `language`, else `user.language`)
  is used only when this browser has no choice of its own (`useAfterLogin`). API codes `en` / `roman` / `ur` map to
  the UI codes `en` / `roman-ur` / `ur` in `src/lib/languagePreference.ts`. An API without the endpoint (404/405)
  is skipped for the rest of the tab — nothing breaks.
- **Right-to-left** — Urdu sets `dir="rtl"` and `lang` on `<html>` and switches to Noto Nastaliq Urdu. Use logical
  classes only (`ms-` / `me-` / `ps-` / `pe-` / `start-` / `end-` / `text-start` / `border-s`); directional icons
  (chevrons, arrows) get `rtl:-scale-x-100`; amounts (`MoneyText` is `dir="ltr"`), phone numbers, codes and
  "12 × 30 ft" sizes are isolated with `dir="ltr"` / `<bdi>` so they don't reorder. `formatDate` / `formatDateTime` / `formatMonth` and the week helpers wrap their text in invisible left-to-right isolates (`isolateLtr`, only while the page is RTL), so "7 Oct 2026" never shows as "Oct 2026 7".
- **Dictionaries** — `src/i18n/en.ts` is the source of keys; `roman-ur.ts` and `ur.ts` must have the same keys
  (typed). Each area has its own files in `src/i18n/areas/<area>/{en,roman-ur,ur}.ts` (`shared`, `app` — auth,
  dashboard, shared components —, `projects`, `procurement`, `labor`, `masterData`, `billing`, `cashSite`,
  `teamCompany`), merged into the three main files. Area `strings` are read as `t("<area>.…")`, area `enums` join
  `enum.*`.
- **Shared words** (`areas/shared`): `field.*` (Amount, Date, Note …), `action.*`, `crumb.*` (breadcrumb sections),
  `validation.*`, `passwordStrength.*`, `status.<domain>.<VALUE>` for every status badge, and enum groups such as
  `trade`, `region`, `laborUnit`, `billingModel`, `holidayType`, `platform`, `walletMethod`.
- **Using them** — `const t = useT(); t("dashboard.atRisk", { n })` (`{name}` placeholders);
  `useEnumT()` → `te("projectStatus", value)` for enum values from the API; `useStatusT()` → `ts("purchase", status)`
  (`<StatusBadge domain value />` translates itself). Module-level config stores keys (`TranslationKey`) and calls
  `t()` where it renders. Navigation labels stay in `src/lib/navigation.ts` with `L(en, romanUrdu, urdu)`.
- **Form messages** — zod schemas can't call hooks: `msg("validation.required", { label: "field.amount" })`
  (`src/i18n/message.ts`) encodes a key and its values; `useFieldError` / FormField show it in the current language
  (values that are keys are translated too). Render other messages with `useMessageT()`. The helpers in
  `src/lib/validation.ts` take a dictionary key as the field label.
- **Writing** — Roman Urdu is plain spoken Urdu with the construction words people really use (site, stock, bill,
  cheque, hazri, peshgi, udhaar, kharcha). Urdu is real Urdu script — no Latin words except Rs, PKR, kg, OTP, PDF, SMS,
  CSV, Excel, WhatsApp, OT, BoQ, IBFT, NTN, CNIC, MB.
- **Tests that keep it complete** — `tests/unit/i18n/dictionaries.test.ts` fails when roman-ur or ur miss a key of
  `en`, have extra keys or empty texts, change `{placeholders}`, or when Urdu still has English in it.
  `tests/unit/i18n/literals.test.ts` scans every `.ts`/`.tsx` file of the company app (`src/features`,
  `src/components`, `src/app`; the admin console and `components/ui` excluded) for hard-coded text: JSX text, text
  props (label, title, placeholder, aria-label, header …), toasts and zod messages. Text that is the same in every
  language on purpose (the language names in LanguageMenu) is marked `// i18n-ignore`.
- Browser tab titles (`export const metadata`) are rendered on the server and stay English.

## Responsive layout

- At `lg` (1024 px) and up the icon rail is a column the menu button slides away. Below `lg` it becomes a
  **drawer** over the page with a backdrop that closes on navigation — logic in `src/components/layout/navDrawer.tsx`
  (`useNavToggle`, `railWrapperClass`, `flyoutClass`).
- Phones: icon-only top bars, narrower rail and flyout, tighter page padding; grid cells may shrink so the page never
  scrolls sideways (wide tables scroll inside their card).

## Shared components worth knowing

| Component                                                    | Use it for                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `RowActions` + `ACTIONS_COLUMN`                              | The one labelled **Actions** button per table row; items can be links, destructive, hidden, or ask to confirm |
| `KpiCard` / `KpiGroup`                                       | KPI tiles (`variant="tile"`, `highlight` = sand) grouped in one glass card                                    |
| `ShareColumns`                                               | Parts of a whole as columns with a legend (share + value)                                                     |
| `Charts` (`BarChartCard`, `AreaChartCard`, `DonutChartCard`) | recharts on the palette above; exact rupees in tooltips                                                       |
| `DataTable` `maxHeight="sm" \| "md"`                         | Caps the table height with a sticky header                                                                    |
| `InviteShare`                                                | Share an invite link: copy, WhatsApp, SMS, email, native share                                                |
| `CheckboxField`                                              | React Hook Form checkbox (e.g. Remember me)                                                                   |
| `LanguageMenu`                                               | The three-language picker                                                                                     |

## Recent features

- **Estimate (BoQ)** — Project → Planning → Estimate (BoQ) (`/projects/:id/planning/estimate`, `features/projects/estimate/`).
  `EstimateView` reads `GET /projects/:id/estimate` (`useGetEstimateQuery`, tag `ProjectEstimate`, invalidated by every wizard /
  room / opening save): KPI tiles, warnings banner (links to the setup tab, Price List, Labour rates), "what it is based on"
  (floors, footprint, external / internal wall run), one `SectionCard` + `DataTable` per stage (work lines shaded, material
  lines indented, formula in a tooltip and printed under the item), material summary, labour, cost summary and the
  calculation notes. `EstimateSettingsModal` (WideModal + FormTabs) edits the assumptions with `PUT …/estimate/settings`;
  ranges mirror the API, every field shows its default + unit, Reset sends `{}`; read-only without
  `projects.estimate.manage` or on a locked project. `labels.ts` translates items, units and formulas (the API sends
  `formula { key, params }`; keys under `projects.estimate.formula.*`, falling back to the API's English `formulaText`).
  Amounts are shown to the rupee; money columns hide without `fields.rates`, contract / margin without
  `fields.contract` / `fields.profit`. Print: `AppShell` hides the top bar, rail and footer and lets the page flow
  (`print:` classes), so any page prints cleanly. Formulas and defaults: API README → "How the estimate is calculated".

- **Roof / lenter and walls** — `wizard/RoofCard.tsx` (one card per floor inside the Plot & Structure form, fields `floors.<i>.roof.*`; rules, defaults, span suggestion and soft warnings in `utils/roof.ts`, mirroring the API's `roof.ts`; `roofToBody` sends `floors[].roof` — null when the card is off, frame fields only for FRAMED) and `wizard/RoomWalls.tsx` (the room card's "Walls" section, form field `walls`, saved with `PUT /rooms/:id/walls` via `useSetRoomWallsMutation`; a new room sends `walls` with its create). Opening rows have a wall select (`side`). RoomsTab has "Auto-set walls" (`POST /floors/:id/walls/auto`). Pairing of shared walls happens on the API; both mutations invalidate `Floors`, the project, review and estimate. Estimate: `MethodBadge` (DETAILED / ESTIMATED / MIXED), steel by size (`steel10` … `steel20`), `DetailedBasis` (brickwork by wall thickness, slab steel by bar size).
- **Contract value from the estimate** — the contract value / labour rate is optional in tab 2 (`ContractTab`, hint "fill this after the
  estimate"; empty is sent as `null`, the review's CONTRACT_VALUE_MISSING blocks activation). `estimate/ContractFromEstimateCard.tsx` (wizard step 6
  and the Estimate page; needs `projects.project.edit` + `fields.contract` + `fields.rates`) shows estimated cost + finishing allowance (FULL) +
  margin = suggested value (Rs 1,000) — labour-only: labour + margin ÷ covered sq ft = rate (Rs 5) — recomputed live by
  `estimate/contractSuggestion.ts` (BigInt, same rules as the API). Margin / finishing start from `contractSuggestion` (project override or company
  default) and say "Margin from company settings (20%)" / "Custom for this project (25%)". "Use as contract value / rate" and, in the wizard, "Finalize
  estimate" (then Review) call `POST /projects/:id/contract/from-estimate` (`useContractFromEstimateMutation`, invalidates project, review and
  estimate); an existing value is replaced only after a ConfirmDialog (current, new, difference). Review shows "Apply company margin (20%) → Rs X"
  next to CONTRACT_VALUE_MISSING (`ApplyMarginAction`). Company settings has "Default profit margin" and "Default finishing allowance". Running
  bills on a FULL / GREY contract show "Rate per sq ft (for running bills)" in tab 2.
- **Estimate step in the project wizard** — steps are now Basic, Contract, Plot & Structure, Coverage, Rooms,
  **Estimate** (`?tab=6`, `wizard/EstimateTab.tsx`), Review (`?tab=7`). The step reuses the estimate sections exported
  from `EstimateView` (`EstimateKpis compact`, `EstimateWarnings` with `onGoToTab` → "Go to <step>" buttons that switch
  wizard tabs, material summary open, stage + labour tables folded, cost summary, basis) plus the Assumptions modal
  (`projects.estimate.manage`, editable while DRAFT / ACTIVE). Nothing to save — Next goes to Review; the estimate is
  refetched every time the step opens (and every wizard save already invalidates `ProjectEstimate`). Review shows an
  "Estimated cost" card (total, per sq ft, margin — quantities without rate access) with "Open estimate".
  Step ids are stable (`WIZARD_STEPS`, `ESTIMATE_STEP` / `REVIEW_STEP`, `clampWizardTab` in `features/projects/constants.ts`);
  without `projects.estimate.view` `visibleWizardSteps()` drops the step, Next / Back skip it via `adjacentWizardStep()`,
  the tab bar numbers the visible steps 1…6 (`Step.number`) and `?tab=6` opens Review. API review / estimate warnings
  keep pointing at tabs 1–5, so no API change was needed.

- **Foundation (Bunyaad)** card in the project wizard's Plot & Structure tab (`wizard/FoundationCard.tsx`), saved
  with `PATCH /projects/:id/plot-structure` as `foundation`. Starts from Pakistani defaults (brick strip footing,
  5 ft excavation, 3 ft wide, 9″ thick — 12″ for other types —, 2 ft plinth, 1.5″ DPC, PCC 1:4:8 × 3″, RCC 1:2:4 with
  #4 (12 mm) bars, termite treatment on, DPC in PCC + waterproofing compound, medium soil). Fields follow the type:
  strip width; footing count + L × W for isolated / combined; pile count, diameter and depth for piles; RCC mix and
  main bar wherever RCC applies (not a brick / stone strip footing); the soil test note only once a test is ticked.
  Only the fields that apply are sent (`utils/foundation.ts` → `foundationToBody`). Shown read-only in the review
  (`components/FoundationSummary.tsx`) and as a card on the project overview and Site Setup (`FoundationSummaryCard`);
  older projects show "Not entered yet". Locked like the rest of the tab.
- **Workforce → Worker Types** (`/workforce/worker-types`): list, add / edit (names in three languages, rate, overtime),
  activate / deactivate. Type names elsewhere come from the API in the current language.
- **Remember me** on login (ticked by default). Unticked, the API sets session cookies that end when the browser closes.
- **Invite link sharing** after inviting or re-sending (Team → Invitations) and for the owner invite on the super
  admin's create-company screen.
- **Team → Roles & Permissions** — access by permission keys, role templates and per-member overrides; see
  [Roles & permissions](#roles--permissions).
- **Super admin Company data** workspace — see [below](#super-admin-company-data).

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

## Change Orders (Phase 3 · Step 15)

Project mode → **Change Orders**: `/projects/:id/change-orders` (list), `/change-orders/new`, `/change-orders/:coId` (detail), `/change-orders/:coId/edit` (draft), `/change-orders/instructions` (site instructions) — `src/features/change-orders/`: `ChangeOrdersView`, `ChangeOrderBuilder`, `ChangeOrderDetailView` (stepper, approve / reject / bill dialogs, `PdfActions` slip), `SiteInstructionsView`, `shared.tsx` (status badge, stepper), `calc.ts` (pure: line / price / total maths mirroring the API, `allowedActions(status, can)`, proof rules). API service `src/api/services/changeOrders.api.ts` (tags `ChangeOrders`, `SiteInstructions`; approving invalidates Projects / Receivables / Finance / Dashboard), types `src/api/types/changeOrders.ts`, texts `src/i18n/areas/changeOrders/` (`t("changeOrders.…")`).
- Gating: list / detail `changeorder.view`, builder + convert `changeorder.create`, edit / send / start / complete `changeorder.edit`, approve / reject `changeorder.approve`, bill `changeorder.manage` + `billing.invoice.create`, site instructions `changeorder.instruction.view|create`. Cost-side money needs `fields.rates` (otherwise the builder hides rates and the API fills them), owner prices `fields.rates` or `fields.amounts`, revised contract `fields.contract`.
- Overview cards: revised contract (Contract card) and revised end date (Client & site card) from `GET /projects/:id` → `changeOrders`.
- Tests: `tests/unit/components/ChangeOrders.test.tsx` (builder maths + live totals, rates hidden, stepper actions by status / permission, rejected step, money gating, nav gating, overview cards).

## Documents & Closeout (Phase 3 · Step 17)

Project mode → **Documents & Closeout**: `/projects/:id/documents/drawings | snags | handover | retention` (`src/features/closeout/`: `DrawingsView`, `SnagsView`, `HandoverView`, `RetentionView`, `schemas.ts`, `shared.tsx`). API service `src/api/services/closeout.api.ts` (tags `Drawings`, `Snags`, `Handover`, `Retention`), types `src/api/types/closeout.ts`, texts `src/i18n/areas/closeout/` (`t("closeout.…")`).

- **Access**: nav items gated by `closeout.drawing.view`, `closeout.snag.view`, `closeout.handover.manage`, `closeout.retention.view`; buttons by `closeout.drawing.manage`, `closeout.snag.create` (log / mark fixed), `closeout.snag.manage` (edit, verify, reopen, delete), "Who pays" needs `closeout.snag.manage` + `fields.amounts`; "Hand over to owner" needs `projects.project.manage` too. Money the API leaves out shows "Hidden for your role" (`MoneyText`).
- **Status rules** (mirror the API): drawings and snags change on ACTIVE / CLOSEOUT / HANDED_OVER projects; the checklist and sign-off on ACTIVE / CLOSEOUT; the handover is completed from CLOSEOUT.
- Photos open in the shared lightbox (`PhotoLightbox` from `features/site/DailyLogsView`); the certificate uses `PdfActions` (fresh signed link each time).
- Tests: `tests/unit/components/Closeout.test.tsx` (nav gating, drawings history, snags with / without money, handover blockers + PM limits, retention gating, Urdu).

## Equipment & shuttering (Phase 2 · Step 16, part 1)

`src/features/equipment`, API `src/api/services/equipment.api.ts`, types `src/api/types/equipment.ts`, texts `src/i18n/areas/equipment/` (en · roman-ur · ur). API contract: `PHASE_2_3_CONTRACTS.md` → Step 16. The Central Store doubles as the **yard**; every site of a non-draft project is a location; one transit bucket in between.

| Where | Page | Keys |
| --- | --- | --- |
| Equipment → **Allocation Map** (`/equipment/allocation`) | `GET /equipment/balances`: KPI tiles (owned, on rent, at sites, yard, in transit), one card per place (yard, each site, transit) listing each item with owned / rented and the rental numbers, plus "Totals by item". Category filter | `equipment.view` |
| Equipment → **Owned Equipment** (`/equipment/owned`, `/equipment/owned/:id`) | Register with owned / sites / yard / transit / on rent, hire rate and replacement value (only with `fields.rates`). Add / edit (SlideOver), **Stock in** (opening or purchase, yard or a project site), **Adjust count** (− disposed / short, + found, at one location). Detail: where it is now + its movement log | view; changes `equipment.manage` |
| Equipment → **Rentals** (`/equipment/rentals`, `/equipment/rentals/:id`) | Hire from a yard supplier: items × rate/day, deposit, start / expected return, delivered to a site or the yard. **Extend**, **Return** (counts per item, damaged, missing — missing must already be reported as a loss — and damage charges), **Close** (deposit refund). Rent to date / posted / deposit / damage charges only with `fields.rates`. Overdue badge and filter | view; actions `equipment.rental.manage` |
| Equipment → **Movements** (`/equipment/movements`, `/equipment/movements/:id`) | Tabs **Transfers** (dispatch / transfer / return, status, route) and **Movement log** (append-only ledger). **Send equipment**: from a place that holds equipment, pick piles (owned, or per rental) with "Available: N"; to the yard or a project. Detail: sent / received / damaged / gap per item, losses created, **Cancel** (`equipment.transfer.create`) and **Receive** (`equipment.receiving.create`) | view |
| Equipment → **Loss & Damage** (`/equipment/loss-damage`) | Losses from counts (`TRANSFER_GAP`) and reports: kind, qty, place, photo, note, value (rates), status. **Report loss** (with photo, `equipment.loss.create`), **Charge** to Project / Sub-contractor (pick the project's sub-contract) / Write off (`equipment.loss.approve`) | view |
| Equipment → **Hire & Rent Charges** (`/equipment/charges`) | Daily INTERNAL_HIRE and RENTAL rows filtered by month / project / kind; correction rows marked; total and amounts only with `fields.rates`. **Post charges now** (`equipment.manage`, `POST /equipment/accruals/run`) | view |
| Equipment → **Shuttering Demand** | Still "Coming soon" — the planner and the idle-rent alert need the Step 13 schedule (Wave 3) | view |
| Project → Site → **Equipment on Site** (`/projects/:id/site/equipment`) | `GET /projects/:id/equipment`: owned / rented here (+ hire per day with rates), hire / rent to date (rates), **On the way here** with **Receive**, rentals of the project, open losses. Buttons: Report loss, Hire equipment, Send / return (from this site) | view (+ action keys) |

**Receiving with counts** (`ReceiveTransferSlideOver`): every item is counted (arrived incl. damaged, damaged, note, photo). Before saving, a **loss preview** lists what will be recorded — sent − arrived → Missing, damaged → Damaged (`previewLosses`). Short or damaged lines need a note (same rule as the API's `NOTE_REQUIRED`). In a blind count (Munshi, company setting) the sent quantity is absent and the preview says the gap is worked out on save.

**Money**: the API leaves out every rate / value / amount without `fields.rates`; the pages also hide those columns, KPI tiles and form fields (`useSeesRates`), so the Munshi never sees them. New status domains `equipmentTransfer`, `rental`, `equipmentLoss`, `equipmentLossKind` (`lib/status.ts`, translated in `areas/shared`), enum groups `equipmentCategory`, `equipmentKind`, `equipmentMovementType`, `equipmentTransferKind`, `equipmentChargedTo(Desc)`, `equipmentLossSource`, `equipmentChargeKind`; equipment error codes in `lib/apiErrors.ts`. Navigation entries are gated by `equipment.view`; permission keys `equipment.view|manage`, `equipment.transfer.create`, `equipment.receiving.create`, `equipment.rental.manage`, `equipment.loss.create|approve` were added to `lib/permissionKeys.ts` and the catalogue fixture.

## Onboarding & data import (Pilot · Part 7)

`src/features/onboarding`, API `src/api/services/onboarding.api.ts`.

- **Setup checklist** (`SetupChecklist`, dashboard, owner only — `company.settings.manage`): progress bar (drawn by width, so it fills from the start side in RTL too), one link per step from `GET /onboarding/checklist` (logo → Settings → Company, rates → Price list + "My rates are fine", team → invite, workers / suppliers → their page with `?new=1` or "or import from Excel" → `?import=1`, first project), a link to Opening balances, demo data controls, and **Hide** (`POST /onboarding/checklist/dismiss`, per company). It replaces the old static "Get started" card. When hidden, only "Remove demo data" stays while a demo exists.
- **Import wizard** (`ImportWizard` / `ImportButton`): an "Import" button in the header of Workers, Sub-contractors, Suppliers, Materials and Clients (shown with that entity's create permission; also opens from `?import=1`). Steps: download the template → choose an .xlsx / .csv → preview (`POST /imports/:entity/preview`) as a DataTable with the problem cells underlined in red and a Problems column, "Only rows with problems" filter → Import. **All-or-nothing**: the Import button stays at 0 rows while any row has a problem unless "Import only the N good rows" is ticked. The file stays in the browser and is sent again on import (the API keeps nothing between preview and commit). Column names come from the API in all three languages.
- **Settings → Opening balances** (`/settings/opening-balances`, `company.opening.manage`): list of entered (locked) balances and a SlideOver form — supplier udhaar, cash in hand (munshi / PM), store stock (quantity × rate) or worker peshgi (worker + project); items that already have one are not offered again.
- **Demo data**: "Try with demo data" / "Remove demo data" (with a confirmation) on the checklist; `DemoBadge` ("DEMO") on the demo project in the projects table / cards, the project header and the rail; `DemoProjectBanner` on the demo project's pages.

## Roles & permissions

Access is decided by **permission keys** from `/auth/me` (`<module>.<resource>.<action>`, e.g.
`labor.settlement.approve`), never by the account role. Backend contract: `../PERMISSIONS_API.md`.

- **THEKEDAR = every key** (also checked client-side, so an owner is never locked out by a stale snapshot). PM /
  MUNSHI get the union of their roles (several allowed) + ALLOW overrides − DENY overrides, resolved by the API.
- `lib/permissions.ts`: `can(me, key)`, `canAny`, `canAll`, `canSeeField(me, "rates" | "amounts" | "profit" |
  "contract")` (from `fieldAccess`), `scopeOf`, `approvalLimitOf`, `withinLimit`, and `canAccess(me, rule)` for rules
  `{ permission?, anyPermission?, allPermissions? }`. `lib/permissionKeys.ts` lists every key as a typed union, so a
  typo fails `tsc` (a unit test keeps it equal to the catalogue).
- Hooks (`components/common/PermissionGate.tsx`): `useCan("key")` / `useCan(rule)`, `usePermissions()` (`can`,
  `canSee`, `scope`, `limit`, `withinLimit`) and `useApprovalLimitHint()` (translated reason to disable an Approve
  button). `<PermissionGate permission="…">` hides; `<RequireAccess permission="…">` guards a page.
- `lib/navigation.ts`: every nav item, project item and "+ Create" action has a key rule; `visibleSections(me, NAV)`
  drops sections without a visible item. `user.role` is only used for rules that stay with the account type (a
  MUNSHI's 7-day hazri window, site cash only, blind counts).
- **403 `PERMISSION_DENIED`**, `APPROVAL_LIMIT_EXCEEDED` and the role errors have friendly messages in
  `lib/apiErrors.ts` (Urdu script too). The error listener refreshes `/auth/me` (at most every 10 s) and shows one
  toast for refused page data; mutations toast through `useMutationToast`.
- **Team → Roles & Permissions** (`/team/roles`, needs `team.member.manage`): role list (Administrator first, system
  templates badged _Template_ and read-only; row Actions: Edit, _Duplicate_, _Rename_; _New role_ from a template or
  empty). Edit / New open the **role modal** (`features/team/components/RoleModal.tsx`, a centered `WideModal`, 90vw /
  max-w-6xl) with **Details** (names en / Roman / Urdu, description, can be given to, start from) and **Permissions**
  (`PermissionMatrix.tsx`: Select all, one section per module with its own select-all and a 3-column grid, scope /
  approval limit (Rs) as small controls under the grid, owner-only keys disabled, data visibility as its own
  section). Templates show _Duplicate to edit_. `/team/roles/:id` opens the list with that role's modal. Labels come
  from `GET /permissions/catalog` in the current language (pure helpers in `lib/permissionCatalog.ts`). Saving
  sends the full list (`PUT /roles/:id/permissions`).
- **Add / Edit member modal** (`MemberModal.tsx`, `MemberRoles.tsx`): tabs **Personal details** (name, phone, email,
  account type, projects; edit adds status, sign-in help, (de)activation) · **Roles** (every role as a checkbox card,
  several allowed; office and site roles can't be mixed; roles beyond a non-owner's own permissions disabled) ·
  **Custom permissions** (every key as a checkbox, pre-ticked from the union of the roles with a _from role_ hint;
  hand-made additions / removals highlighted; "+N added, −M removed vs <roles>"). Back / Next and Save on every tab;
  a tab with validation errors gets a dot. The account type follows the roles (`accountOfRoles`). Pure logic in
  `lib/rolePermissions.ts` (`unionGrants`, `diffGrants`, `reapplyChanges`, `canGive`, `fitsWith`). Invite sends
  `roleIds` + `permissionOverrides` (the diff); edit sends `PATCH /users/:id`, `PUT /users/:id/projects`,
  `PUT /users/:id/roles`, `PUT /users/:id/permission-overrides` as needed.
- RTK Query: `api/services/permissions.api.ts` (`getPermissionCatalog`, `getRoles`, `getRole`, `createRole`,
  `duplicateRole`, `updateRole`, `setRolePermissions`, `getUserPermissions`, `setUserOverrides`, `setUserRole`, `setUserRoles`; tags
  `PermissionCatalog`, `Roles`, `UserPermissions`). Changes also invalidate `Me`.
- Tests: `tests/unit/lib/permissions.test.ts`, `lib/navigationPermissions.test.ts`,
  `components/PermissionHooks.test.tsx`, `components/PermissionMatrix.test.tsx`. Fixtures build `/auth/me` from the
  real templates (`tests/unit/permissionTemplates.ts`, `catalogFixture.json` — refresh them when the catalogue
  changes).

## Super admin: Company data

Platform console → **Company Data** (`/admin/data`): pick a company in the bar at the top and work in **that company's own screens** — Dashboard, Projects (and inside a project: Planning, Site, Labor, Cash Book, Billing), Sales, Suppliers & Stock, Workforce, Finance, Reports, Team, Settings. Access is **direct and full** (owner decision): no request, no reason, no read-only mode, no timer, and the company is not notified. Every change is silently logged in the company's audit log with the admin's name. **Exit** (the small bar at the top) or the ✕ next to the company leaves it. Company detail (`/admin/companies/:id`) also has read-only tabs: Projects, Team & devices, Activity & money.

How it works:

- `/admin/data/<company path>` renders the company app's page for `<company path>` (`app/admin/(console)/data/[[...path]]`). The list of pages is generated: run `npm run routes:company` after adding or moving a page under `(company)` or `(project)` (a unit test fails when it is out of date).
- Picking a company opens it at once (`useCompanyData.choose` → `useActAsSwitch.enter`); nothing is sent to the server to start or end it.
- The chosen company is the `act_as_tenant` cookie (`lib/actingCompany.ts`). While it is set (and the admin is signed in), the company API sends `X-Act-As-Tenant` with the admin's session and refreshes through the admin refresh endpoint; the proxy sends company links (`/projects/…`) to `/admin/data/…`, so every page's own links stay in the console. A leftover `act_as_session` cookie from the former support-session flow is cleared.
- `ActAsBanner` (in `AdminShell`, every admin page): a small neutral bar "Viewing <company> · platform admin · full access · changes are logged" with **Open company** (outside Company Data) and **Exit**.
- The company owner sees every change the admin made in **Settings → Audit log** (`/settings/audit-log`, `company.audit.view`) as "Platform support · <admin>"; filter "Platform support only". Older rows from the former support-session flow still show their reason.
- Switching company or exiting clears the company cache, so one company's data never shows in another. Admin logout clears the choice too.
- Changes are made as the company's hidden "Super Admin (Platform)" user and logged with the admin's name (see the backend README).

## Deployment (Docker, CI/CD)

Full guide (VPS, DNS, HTTPS with Caddy, env files, releases, rollback): **[construction-platform/docs/DEPLOYMENT.md](../construction-platform/docs/DEPLOYMENT.md)** — the compose stack lives in the API repo.

- `next.config.ts` has `output: "standalone"`: `next build` also writes `.next/standalone/server.js`, which the `Dockerfile` runs (Node 24 alpine, user `node`, `HEALTHCHECK` on `GET /api/health`). `npm run dev` / `npm start` are unchanged.
- `API_ORIGIN`, `API_PUBLIC_URL` and every `NEXT_PUBLIC_*` value are **baked in at build time** (rewrites, CSP, browser code), so they are Docker **build args** and each environment gets its own image: `construction-web:staging-<sha>` / `production-<sha>`. In the compose stack `API_ORIGIN=http://api:4000`. Runtime env: only `SENTRY_DSN` (server-side override).
- `SENTRY_AUTH_TOKEN` (source maps) is passed as a BuildKit secret: `docker build --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN …`.
- GitHub Actions: `.github/workflows/ci.yml` (pull requests: typecheck, lint, unit tests, build), `release.yml` (main → staging image → deploy over SSH), `deploy-production.yml` (manual, `production` environment approval). Required secrets / variables: DEPLOYMENT.md → GitHub set-up.

```bash
docker build -t construction-web --build-arg API_ORIGIN=http://host.docker.internal:4000 .   # API on your machine
docker run --rm -p 3000:3000 construction-web          # http://localhost:3000/api/health → {"status":"ok"}
```

## Observability

Optional and **off by default**: with the env keys empty, `Sentry.init` is never called, posthog-js is never downloaded and the CSP `connect-src` stays `'self'`. Code: `src/instrumentation.ts` (Next.js server), `src/instrumentation-client.ts` (browser), `src/lib/observability/` (`sentry.ts`, `scrub.ts`, `analytics.ts`, `identity.ts`, `hash.ts`). Same contract as the API (see its README "Observability").

### Sentry (errors + performance, `@sentry/nextjs`)

- `NEXT_PUBLIC_SENTRY_DSN` on → browser + server (`SENTRY_DSN` overrides on the server). Also `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (default 0.1). Render / route-handler errors via `onRequestError`; page navigations via `onRouterTransitionStart`. No session replay.
- **No PII**: `sendDefaultPii: false`; `beforeSend` / `beforeSendTransaction` / `beforeBreadcrumb` run `scrub.ts`, which drops request bodies, cookies and env, filters `Authorization` / `Cookie` / token / act-as / forwarded-for headers and secret-looking query values (token, code, sig, phone, email …), hides invite / reset tokens in paths, and masks emails, Pakistani / E.164 phones, JWTs, `Bearer` values, long tokens and `Rs` amounts in messages, exceptions, breadcrumbs and extras. The Sentry user is `{ id: <hashed user id> }` only, plus a `tenantId` tag.
- **Build**: `withSentryConfig` (source-map upload) wraps `next.config.ts` **only when `SENTRY_AUTH_TOKEN` is set** (with `SENTRY_ORG`, `SENTRY_PROJECT`); otherwise the build is unchanged.

### Product analytics (PostHog, `posthog-js`)

- `NEXT_PUBLIC_POSTHOG_KEY` (+ optional `NEXT_PUBLIC_POSTHOG_HOST`) on → `track(event, props)` in `lib/observability/analytics.ts` lazily imports and initialises posthog-js on first use. Autocapture, page views / leaves, session recording, heatmaps, surveys, feature flags and external script loading are all **off**; `before_send` drops any event outside the shared list and strips query strings from URLs.
- The web sends only **`login`** (after every successful sign-in: password, OTP, signup, invite, company pick) with `client: "web"`, `method`, `role`. Business events (`project_activated`, `hazri_marked`, `purchase_saved`, `invoice_issued`, `sync_error`) come from the API.
- Person = first 32 hex of SHA-256(`"user:" + userId`) (same as API and mobile); company = group `company` keyed by the tenant id. Sign-out resets both.
- Props allow-list: `client, platform, method, source, role, status, kind, count, error_code, app_version, offline, duration_ms`; numbers only for `count` / `duration_ms`; strings that look like an email, phone, token or amount are dropped. **No money values, names, phones or emails.**

### CSP

`src/lib/securityHeaders.ts` adds to `connect-src` the Sentry ingest origin taken from the DSN (no key or path) and the PostHog host (plus `us-` / `eu-assets.i.posthog.com` on PostHog Cloud), **only when their env is set** at build / start time.

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
6. **Permissions hide, never disable.** Gate on permission keys (`useCan("…")`, `PermissionGate`,
   `RequireAccess`), never on `user.role`; omitted financial fields render `HiddenForRole`. The one exception: an
   Approve button above the user's approval limit is disabled with the reason (`useApprovalLimitHint`).
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

**Security headers** (every page, `next.config.ts` → `src/lib/securityHeaders.ts`): Content-Security-Policy (self + the API file origin + Cloudinary; `frame-ancestors 'none'`; dev adds `'unsafe-eval'` + websockets for hot reload), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, COOP and HSTS in production. A new external origin (CDN, analytics, maps) must be added there or the browser blocks it. Overview: [../construction-platform/docs/SECURITY.md](../construction-platform/docs/SECURITY.md).

- Web sign-in uses the backend's cookies (`client: "web"`); nothing is stored in localStorage.
- `proxy.ts` only checks that a cookie exists. The shells call `GET /auth/me` (or `/admin/auth/me`).
- A 401 triggers **one** `POST /auth/refresh` behind a mutex; parallel requests wait and retry. A failed
  refresh or a revoked session sends the user to `/login?next=…`, where a silent `/auth/me` signs them
  straight back in if the refresh cookie is still valid.
- `PLAN_LIMIT_REACHED` opens the upgrade dialog, `ACCOUNT_READ_ONLY` shows the read-only banner and
  `COMPANY_SUSPENDED` goes to `/suspended` — app-wide, from `store/errorListener.ts`.
