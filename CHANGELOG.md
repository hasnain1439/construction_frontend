# Changelog

All notable changes to the construction web app. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Adding an entry:** write a short, user-facing line under **Unreleased**, in the right group (Added / Changed / Fixed / Removed). On release, rename Unreleased to the date.

## [Unreleased]

### Added
- **Add / Edit member** is now a wide centered modal with three tabs — Personal details, Roles (tick one or more roles: Administrator, Project Manager, Munshi, Accountant, Store Keeper and your own roles) and Custom permissions (every permission as a checkbox, pre-ticked from the roles, with "+N added, −M removed"). The account type follows the roles; office and site roles can't be mixed; things you don't have yourself are disabled.
- **Roles & Permissions**: create / edit a role in the same centered modal (Details | Permissions with Select all, a section per module and a 3-column grid); templates are read-only with Duplicate to edit. The old role editor page now opens this modal.

- **Setup checklist** on the dashboard for the owner: progress bar and a link for each step (logo, rates, invite team, workers, suppliers, first project) from the API, "My rates are fine", a link to Opening balances, "Try with demo data", and Hide. It replaces the old "Get started" card.
- **Import from Excel / CSV** on Workers, Sub-contractors, Suppliers, Materials and Clients: download the template, upload, check every row (problems highlighted per cell), then import — nothing is imported while a row has a problem unless you choose to import only the good rows.
- **Settings → Opening balances**: supplier udhaar, cash with a munshi / PM, store stock with its rate and worker peshgi from before the app — entered once per item and then locked.
- **Try with demo data**: one click adds a sample project (DEMO badge and banner) with workers, hazri, a purchase, kharcha and a draft invoice; "Remove demo data" deletes all of it. It doesn't count against the plan.
- New texts in English, Roman Urdu and Urdu; new cash type "Opening cash in hand" and stock movement "Opening stock"; API types regenerated; new permission `company.opening.manage` in the permission keys and catalogue fixture.

- **Docker image** for production: multi-stage `Dockerfile` on Next.js standalone output (`output: "standalone"` in `next.config.ts`), Node 24 alpine, non-root, healthcheck on the new `GET /api/health`; API origin, CSP origins and `NEXT_PUBLIC_*` keys are build args (one image per environment). See README → Deployment.
- **GitHub Actions**: pull requests run typecheck, lint, unit tests and a production build; `main` builds the staging image (`ghcr.io/<owner>/construction-web:staging-<sha>`) and deploys it to staging over SSH; production is a manual workflow behind the `production` environment's approval.

- **Team → Roles & Permissions**: see every role (templates are read-only — duplicate one to change it), create your own, and tick what each role may do per area and action, with "assigned / all projects", an approval limit in rupees and which values (rates, amounts, profit, contract) it sees.
- In a member's panel: their permission role, extra or removed permissions, and a preview of everything they can do and where it comes from. Invites can pick a permission role.
- A clear "You don't have permission" message, in all three languages, when the server refuses something.
- Super admin **support sessions**: opening a company in Company Data asks for a reason and a length (default 60 minutes) and starts **read-only**. A red banner on every admin page shows "Acting as <company> · read-only · 42 min left · End", with a write-mode switch that asks for a second reason.
- Platform console → **Support Sessions** page: every session with company, admin, reasons, mode and status; filter by company and live / finished; end a live session.
- **Settings → Audit log** for the owner: who changed what, with every platform support visit (support person and reason) highlighted and a "Platform support only" filter. New "Platform support accessed your account" notification type.
- Optional **error monitoring (Sentry)** for the browser and the Next.js server and **product analytics (PostHog)** sending only a `login` event (hashed user id, company group). Both are off unless `NEXT_PUBLIC_SENTRY_DSN` / `NEXT_PUBLIC_POSTHOG_KEY` are set; reports are scrubbed of emails, phones, tokens, cookies, request bodies and query secrets, and the CSP allows their hosts only when configured. See README "Observability".

- **Every page in Roman Urdu and Urdu**: lists, forms, side panels, dialogs, toasts, table headers, empty states, form errors, status badges, charts and print previews of the company app now follow the chosen language (the platform admin console stays English). Urdu pages lay out right-to-left, with amounts, phone numbers and sizes kept left-to-right.
- **Your language follows you**: changing the language saves it on your account, and signing in on a new browser opens the app in your account's language (unless that browser already has a language picked). Uses the API's new `PATCH /auth/me/preferences` and `language` in `/auth/me`; with an older API the language simply stays per browser.
- Tests that fail when a Roman Urdu or Urdu text is missing, empty, has different `{placeholders}` or still has English in the Urdu, and when a company-app page shows hard-coded English text.

### Changed

- **Super admin: direct, full access to any company.** Choosing a company in Company Data opens it at once with full read and write access — no reason dialog, no read-only mode, no write-mode switch, no 60-minute timer, and the company owner gets no notification or email. A small neutral bar on every admin page shows "Viewing <company>" with **Exit**. Only `X-Act-As-Tenant` is sent (no `act_as_session` cookie / `X-Act-As-Session` header). Every change is still logged silently in the company's audit log with the admin's name. This replaces the support-session entries above (never released). API types regenerated.
- Settings → Audit log text: lists changes made by platform support with the support person's name (no more promise of a notification / email).
- `503 SMS_UNAVAILABLE` (login code could not be sent) shows a friendly message in English / Roman Urdu / Urdu; API types regenerated.
- Menus, buttons and row actions follow each person's permissions instead of their account type, so a PM or Munshi sees exactly what their role allows (for example, a PM now also sees Store Stock, Supplier Ledger and Cash Floats — read-only where they can't act).
- Approve buttons are disabled, with the reason, when the amount is above the person's approval limit.
- The "can see financials" switch in the member panel is replaced by "Add financial access" under extra permissions.

### Removed

- Start-support-session dialog (reason, length), the red read-only banner with countdown and the write-mode dialog (`StartActAsDialog`, old `ActAsBanner`).
- Platform console → **Support Sessions** page (`/admin/support-sessions`, `ActAsSessionsView`), its menu item and the `/admin/act-as-sessions` API calls (`actAs.api.ts`).
- `ACT_AS_SESSION_*` / `ACT_AS_READ_ONLY` error messages and handling, the `act_as_session` cookie (now only cleared) and the unused `actAs.*` texts in all three languages.

### Fixed

- Side panels and money fields lay out correctly right-to-left in Urdu (close button, "Rs" prefix).
- In Urdu, dates and week ranges no longer flip ("Oct 2026 7" → "7 Oct 2026", "Oct 2026 18 – 12" → "12 – 18 Oct 2026"); amounts stay left-to-right.

### Security

- Every page sends security headers: a Content-Security-Policy (only this site, the API's file origin and Cloudinary; no framing), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` turning off camera / microphone / location / payment, `Cross-Origin-Opener-Policy` and HSTS in production (`src/lib/securityHeaders.ts`). New optional `API_PUBLIC_URL` when signed file links use another address than `API_ORIGIN`.

## 2026-10-12 — Worker Types, Actions menu, invite sharing

### Added

- **Workforce → Worker Types** page: list, add and edit worker types (names in English, Roman Urdu and Urdu, daily rate, overtime), activate or deactivate them.
- **Remember me** on the login page. Unticked, you are signed out when the browser closes.
- One labelled **Actions** button on each table row that holds every action for that row.
- After inviting or re-sending an invite, the invite link can be shared by copy, WhatsApp, SMS, email or the phone's share sheet.
- The super admin can share the owner's invite link from the create-company screen.

### Changed

- Worker type names in forms and lists come from the server, in the current language.
- Language is now picked from a dropdown; search opens from an icon button.
- The footer looks like the top bar and starts after the side rail.
- Rings and the first chart series now use teal, from the validated chart palette.

### Removed

- Log out from the side rail (it is in the account menu only).
- The glow in the bottom-left corner of the page background.

## 2026-10-11 — Phones and tablets

### Added

- On screens narrower than a laptop, the side rail turns into a drawer with a dimmed backdrop. It closes when you navigate.

### Changed

- The sub-menu flyout always uses the full height of the screen.
- Compact, icon-only top bars on phones; the language switch moves into the user menu.
- Tighter page padding on phones, a shorter login tab label, and dashboard cards that reflow on tablets.

### Fixed

- Pages no longer scroll sideways on small screens.

## 2026-10-09 — Three languages

### Added

- Three UI languages: English, Roman Urdu and Urdu (Nastaliq, right-to-left). Latin text and numbers stay in the Cabin font.
- The menu, app shell and dashboard are translated, as are project statuses, payment methods, worker types and notifications.
- Language picker with the three options.

### Changed

- English screens use plain English words (Purchases, Attendance, Expenses, Advances…) instead of Roman Urdu.

## 2026-10-08 — Warm "cabin" redesign, admin Company data

### Added

- Super admin **Company Data** workspace: pick a company and view, add, edit or delete its data in the company's own screens.
- A munshi can choose a password when accepting an invite.
- **Sign-in help** for munshis (Team → edit member): the owner can get a one-time sign-in code to pass on or send on WhatsApp, or set a password.
- Login page with an animated building photo.
- Tables can be given a fixed height with a sticky header.

### Changed

- New warm look: sand, sun, stone and charcoal colours, the Cabin font, frosted-glass cards on a warm gradient. Sand is the main colour in dark mode.
- KPI tiles with a sand highlight and an icon watermark that grows on hover.
- Cleaner bar charts (rounded bars, headline numbers, clearer tooltips) and "share of total" column breakdowns.
- The dashboard projects summary shows the 5 most relevant projects.
- The admin console uses one merged rail; slide-over panels fit small screens.

## 2026-10-07 — Daily Logs and phone sync

### Added

- **Project → Site → Daily Logs & Photos**: entries by date with photos, voice notes, site conditions and a day summary.
- **Team → Devices** shows uploads still waiting on phones and the latest rejected entries.
- A "late sync" badge on attendance, expenses, purchases and gate passes that reached the office more than 48 hours after they were made on a phone.

## 2026-10-06 — Labour, Cash Book, Billing, Dashboard and Reports

### Added

- **Labour:** Team on Site, attendance register, work measurements, advances, weekly wage settlements, sub-contractor accounts, worker and sub-contractor detail pages.
- **Cash Book:** site expenses, cash floats, top-up requests, cash counts and handover; Finance → Cash Floats Overview.
- **Billing:** payment schedule, invoices and running bills, payments received with cheque status, owner statement, Finance → Receivables, client statements. PDFs can be previewed, downloaded or shared on WhatsApp.
- **Dashboard:** rebuilt company overview, a site dashboard for munshis, My Approvals with bulk actions, a notification bell and an Alerts page.
- **Finance and Reports:** Cash Flow Outlook, Profit & Loss (company and per project), receivables ageing, and seven reports with CSV / Excel / PDF export.

### Changed

- Page content uses the full screen width; the menu button slides the side rail out instead of narrowing it.

### Fixed

- The footer can no longer be pushed off screen by browser extensions.
- Recording a client cheque status no longer clashes with supplier cheques.

## 2026-10-05 — First release (Phase 1, steps 1–6)

### Added

- Sign-in with password or phone OTP, company switching, invitations, sign-up and password reset.
- Company settings, team, subscription, master data, clients, and projects with a 6-step setup wizard.
- Platform admin console.
- Procurement and inventory: purchases, returns, purchase orders, store stock, dispatches, shortages, supplier ledger and payments, and the project Site pages (incoming material with blind counting, deliveries, usage, site stock, counts and transfers).

### Fixed

- Theme toggle error on page load; the sessions dialog stays on screen; wide tables scroll sideways instead of the whole page; slim themed scrollbars; temporary server errors are retried.
