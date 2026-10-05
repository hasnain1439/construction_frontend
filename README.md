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

| Variable | Default | What it does |
|---|---|---|
| `API_ORIGIN` | `http://localhost:4000` | Where `/api/v1/*` is proxied (next.config.ts rewrites). |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | Shown in the sticky footer. |

The browser never calls the API origin directly. `next.config.ts` rewrites `/api/v1/:path*` to
`${API_ORIGIN}/api/v1/:path*`, so the backend's httpOnly cookies (`access_token`, `refresh_token`,
`admin_*`) are first-party and no CORS is involved.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint (0 warnings allowed) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest unit + component tests (`tests/`) |
| `npm run e2e` | Playwright smoke tests (`e2e/`) — needs the backend running; starts `next start` (run `npm run build` first) or reuses a server on :3000 |
| `npm run api:types` | Regenerates `src/api/generated/schema.ts` from the running backend's `/api/docs.json` |
| `npm run format` | Prettier |

## Seed accounts (backend `npm run db:seed`)

| Who | Sign in with | Password |
|---|---|---|
| Thekedar — Khalid Malik (Malik & Sons Builders) | `0300 1234567` or `khalid@maliksons.pk` | `Thekedar#2026` |
| PM — Bilal Ahmed (no financials) | `0333 1112233` | `Bilal#2026` |
| Munshi — Rafaqat Ali (two companies) | `0321 1234567` → **Phone OTP** tab | code printed in the backend terminal |
| Platform admin | `/admin/login` · `admin@platform.local` | `Admin#2026` |
| Pending PM invite — Kamran Shah | `/invite/dev-invite-kamran-shah-2026-0001` | chosen on accept |

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
│   ├── common/                   # DataTable, Pagination, FilterBar, SearchInput, DateRangePicker, StatusBadge, KpiCard, RingKpiCard, …
│   └── forms/                    # Form, FormField, TextField, NumberField, MoneyInput, PhoneInput, SelectField, ComboboxField, …
├── features/<module>/            # components/ views/ hooks/ schemas — auth, company, team, subscription,
│                                 #   master-data, clients, projects (wizard/), dashboard, admin
├── hooks/                        # useListState, useMutationToast, useReadOnly, useSearchFlag
├── lib/                          # money, phone, dates, permissions, apiErrors, navigation, status, options, validation, cn, session
└── i18n/                         # en.ts, roman-ur.ts, useT.ts
tests/unit/ · e2e/
```

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
