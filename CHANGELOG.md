# Changelog

All notable changes to the construction web app. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Adding an entry:** write a short, user-facing line under **Unreleased**, in the right group (Added / Changed / Fixed / Removed). On release, rename Unreleased to the date.

## [Unreleased]

### Step 12
- **Sales → Quote Pipeline** is live: a board with one column per status (Draft, Sent, Negotiation, Won, Lost, Expired) or a table; search, status filter and **Needs follow-up** (sent more than 5 days ago with no reply).
- **New Quote**: client (existing or new), title, site, plot, covered area, storeys, mumty / basement, structure, contract type, material quality, payment schedule, margin / finishing % and an optional agreed price on one side; on the other a **live internal view** (price, per sq ft, cost, margin, cost by work section, key quantities, floors assumed, warnings) and the **customer view** (what the quotation shows — never costs or margins).
- **Quote Detail**: status, client and validity, internal + customer views of the latest revision, revision list and **compare** (inputs, price, cost, margin, each work section), activity, actions — send to the client (customer PDF + WhatsApp), customer / internal PDFs, record negotiation, new revision, mark lost with a reason, delete, and **Mark as won** → opens the pre-filled draft in the New Project wizard.
- **Win / Loss Insights**: win rate, quotes, won / lost, average rate quoted vs won, open pipeline, quotes per month chart, loss reasons, follow-up list.
- Gating: `sales.quote.view|create|edit|approve|manage`; price needs `fields.contract`, cost `fields.rates`, margin `fields.contract` + `fields.profit` ("Hidden for your role" otherwise). Texts in English, Roman Urdu and Urdu (`src/i18n/areas/sales/`). API types regenerated (adds the Step 11 estimate and Step 12 quote paths).

### Step 11
- **Project → Planning → Estimate (BoQ)** now works with saved **estimate revisions**: pick a revision (draft, approved, superseded) or the live preview; KPIs for estimated cost (direct + site overheads + contingency), cost per sq ft and **margin vs contract**; the BoQ **grouped by the 14 sections** (excavation … contingency) with a total per section and the grand total; every line shows its stage, quantity with wastage, supplier, rate and amount and a **"How it is worked out"** popover with the formula and each step. Owner-supplied lines keep their quantity and say **Owner** instead of a rate / amount.
- **Generate estimate** (saves draft Rev n, an existing draft is opened instead), **Regenerate** a draft, **Adjust** a draft line (quantity / rate with a reason, or remove the adjustment), **Approve** with a confirmation (needs `estimate.revision.approve`; a draft with outdated rates needs an extra tick), **"Rates outdated"** banner, and the internal **BoQ PDF** (preview, download, WhatsApp). Before the first revision the page shows a "Generate the first estimate" card above the live preview (the grey-structure working folds underneath); the wizard's Estimate step and "Contract value from this estimate" keep working.
- **Estimate Revisions** page: every revision with totals, margin, generated / approved by and date; **Compare** two revisions — total and per-section difference, lines added / removed / changed with quantity and amount changes.
- **Owner Shopping List** page: what the owner buys, grouped by the stage that needs it (quantity to buy rounded up), from the approved revision, else the draft, else the live preview; share as **WhatsApp text** or **PDF** — never a rate.
- **Settings → Rulebook**: every estimation value of the company's region with unit, platform value, company value and note, safe range and a **"Pending engineer review"** badge; set or remove a company value (checked against the safe range; the API's out-of-range error shows on the field). Needs `rulebook.override.view` / `.manage`.
- **Admin console → Rulebook**: versions per region (draft / published), new version copied from the published one, edit values / safe ranges (draft only) and the engineer review status, notes, publish with confirmation, delete a draft.
- Activating a project now opens Planning → Estimate (BoQ) with the "Generate estimate" call to action (API `nextStep: "GENERATE_ESTIMATE"`). The "Coming soon" entries for Estimate Revisions, Owner Shopping List, Settings → Rulebook and Admin → Rulebook are gone.
- Without `fields.rates` every page shows quantities only (no rates, amounts, cost KPIs or rupee figures in formulas). All texts in English, Roman Urdu and Urdu (`src/i18n/areas/estimates/`); new status domains `estimateRevision`, `rulebookVersion`; Step 11 error messages.

### Step 16
- **Equipment & shuttering** (part 1): Equipment → **Allocation Map** (where every plate, prop and machine is — yard, each site, on the road; owned vs rented), **Owned Equipment** (register, add / edit, stock in, adjust count, detail with movement log), **Rentals** (hire from a yard with rate per day and deposit; extend, return with counts and damage charges, close with deposit refund; overdue badge), **Movements** (send / transfer / return equipment, transfer detail with cancel and receive, movement log), **Loss & Damage** (report with photo; charge to the project, a sub-contractor or write off) and **Hire & Rent Charges** (daily rows by month / project, "Post charges now").
- Project → Site → **Equipment on Site**: what is at the site (owned vs rented), equipment on the way with **Receive**, the project's rentals and open losses; report a loss, hire equipment, send / return from the site.
- **Receive with counts**: every item is counted; before saving a preview shows the losses that will be recorded (sent − arrived → missing, damaged → damaged). Blind count hides the sent quantity.
- Rates, values and amounts appear only for people who can see rates (the Munshi never does). Menu items need `equipment.view`; actions their own keys. Shuttering Demand stays "Coming soon" until the planner (Wave 3). All texts in English, Roman Urdu and Urdu; API types regenerated; equipment permission keys added to the key list, role templates in tests and the catalogue fixture.
- **Equipment → Shuttering Demand** is live (part 2): plates and props the slab milestones need each week for all active projects or one, against owned and rented units — chart with the shortfall in red, week-by-week table, slab milestones (area, plates held until the slab is struck) and suggestions (extend a rental, send from the yard, move from an idle site, rent, return) with one-click pre-filled rental / transfer forms. Assumptions shown for the engineer to check.
- **Idle rented equipment** panel on Rentals and Shuttering Demand: rentals sitting at sites with no milestone work for N days, days idle, last work and the rent being wasted (only for people who see rates); **Check now** sends the alert. New alert type "Rented equipment idle" in Alerts & Notifications.
- Settings → **Alerts & Limits**: idle rented equipment alert (days), props per shuttering plate and spare plates %. API types regenerated (341 paths).
### Step 17
- **Project → Documents & Closeout** pages are live (no more "Coming soon"): Drawings, Snag List, Handover, Retention — each shown only with its `closeout.*` permission.
- **Drawings**: folders (Architectural, Structural, MEP, Society approved, Other) with counts, search, latest revision badge and approval date; revision history slide-over keeps superseded revisions (open any file), upload a new revision, mark approved today, add / edit / delete drawings.
- **Snag List**: KPIs (open, fixed — to check, verified, rework cost or overdue), filters (status, worker / sub-contractor, overdue / defect period / before handover, search), before / after photos with a lightbox, log a snag (room or location, two photos, assign to a worker or sub-contractor, target date), mark fixed with an after photo, verify, reopen with a reason, edit / assign, delete; **Who pays** (rework → project cost, deduct from the sub-contractor, change order, nobody) with the amount — only for people who see amounts; a Munshi never sees money.
- **Handover**: checklist (keys, electricity / gas / water connection, warranty cards, final drawings, final photos) with tick, note and photo; owner sign-off (name, date, photo of the signed slip); "Hand over to owner" with the handover date, blockers and open snags (needs the project-status permission); handover certificate PDF — preview, download, WhatsApp.
- **Retention**: due date (handover + defect period) with days left, owner retention and its invoice, sub-contractor retention held until the same date, open defect snags, reminder lead time; amounts hidden without `fields.amounts`.
- Texts in English, Roman Urdu and Urdu (`src/i18n/areas/closeout/`); API types regenerated (`src/api/generated/schema.ts`), hand-written response types in `src/api/types/closeout.ts`, service `src/api/services/closeout.api.ts`.

### Added
- **Contract value from this estimate** card on the wizard's Estimate step and the project's Estimate page (for people who can edit the project and see contract values and rates): profit margin % (default from company settings) and, for a full contract, a finishing allowance % (the estimate is grey structure only); shows estimated cost + finishing + margin = suggested contract value (nearest Rs 1,000), or for labour-only a suggested rate per sq ft (labour + margin ÷ covered area, nearest Rs 5). "Margin from company settings (20%)" / "Custom for this project (25%)" says where the number came from. "Use as contract value" / "Use as rate" saves it; a value already there shows "Current" and the difference and is replaced only after you confirm.
- **Finalize estimate** button in the wizard's Estimate step: sets the contract value from the estimate (asks first if one exists) and goes on to Review.
- On Review, **"Apply company margin (20%) → Rs X"** next to "Enter the contract value" sets it in one click.
- Company settings: **Default profit margin** (20 %) and **Default finishing allowance** (0 %, full contracts only).
- Contract & Supply: "Rate per sq ft (for running bills)" when a full / grey contract is billed by running bills.
- **Roof / Lenter card per floor** (Plot & Structure tab): switch on "Enter roof details" to pick the roof type (RCC slab / T-iron + tiles / precast planks / steel deck), concrete mix, steel grade, slab thickness, main and distribution bars ("#4 (12 mm) @ 6″"), top bars, cover, sunshade; garder size / spacing / bricks or tiles / screed / earth; plank or deck area + topping + mesh; beams and columns for an RCC frame. Shows the suggested thickness for the largest room span and warns when the slab is too thin or the bars too far apart. Off = the estimate keeps the slab % from the assumptions.
- **Walls in each room card** (Floors & Rooms): "Set walls" gives four sides (top / right / bottom / left with their lengths); each side is External, Shared with a room (pick the room — the other room's side is set to shared too and the wall is counted once), Party (with "Already built"), Double (cavity), Open or Passage, with its thickness, and a small plan diagram coloured by type. Doors and windows can be placed on a wall. "Auto-set walls" fills every room of the floor with external walls (explained in the confirm dialog).
- The estimate shows **Detailed / Estimated** on every work line and per floor (walls, roof), steel **by bar size** (Steel #3 (10 mm), #4 (12 mm) …) in the KPI, stage totals and material summary ("General steel rate" when a size has no rate of its own), brickwork by wall thickness and slab steel by size in "What the estimate is based on", and the new roof / wall warnings per floor. All texts in English, Roman Urdu and Urdu.
- **Estimate step in the New Project wizard**, between Floors & Rooms and Review ("Estimate" / "Andaza" / "تخمینہ"): the contractor sees estimated cost, cost per sq ft, cement, bricks, steel and margin vs contract before activating, with the material summary, foldable stage and labour tables, warnings whose "Go to …" buttons jump to the wizard tab to fix, and the **Assumptions** button to adjust settings right there. Nothing to save — Next goes to Review, which now shows an "Estimated cost" card linking back. Without `projects.estimate.view` the step is hidden and the other steps renumber. Review is now `?tab=7` (old `?tab=6` links open the Estimate step, or Review without access).
- **Estimate (BoQ)** page in each project (Planning → Estimate (BoQ), needs `projects.estimate.view`): KPI cards (estimated cost, cost per sq ft, cement bags, bricks, steel tons, margin vs contract), four stage sections — Foundation, Brickwork, RCC, Plaster — each a table of item, floor, quantity (with wastage), unit, rate, amount and a formula tooltip, a material summary priced from the price list, labour, a cost summary and "How the estimate is calculated". A warnings banner lists missing rooms / foundation / covered area / rates with links to the project setup, Price List or Labour rates. **Assumptions** opens a wide modal (Walls, RCC & steel, Plaster, Foundation, Factors & labour) with every Pakistani default and its unit, "Reset to defaults", read-only without `projects.estimate.manage` or on a locked project. **Print** gives a clean print-out (no menus; formulas printed under each item). Rates and money hide without the matching data-visibility permissions. English, Roman Urdu and Urdu.
- The project overview's "Estimate (BoQ)" card now shows the estimated cost, cement, bricks and steel with a link to the page (replaces the "coming soon" card).
- Permission keys `projects.estimate.view` / `projects.estimate.manage`; API types regenerated.
- **Foundation (Bunyaad)** in the project setup (Plot & Structure tab): foundation type (strip, isolated, combined, raft, pile), excavation depth, footing size and thickness, plinth height, DPC, number and size of footings or piles, masonry, PCC and RCC mix, main steel bar ("#4 (12 mm)"), termite (deemak) treatment, DPC material, soil type, water table, dewatering and soil test — pre-filled with the usual Pakistani values, with only the fields for the chosen type. It appears in the Review step and on the project overview / Site Setup. In English, Roman Urdu and Urdu; API types regenerated.
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
- Contract & Supply no longer requires the contract value (or labour rate) before you have seen the estimate: "You can fill this after seeing the estimate (step 6) — required before activating." Review still blocks activation until it is set.
- The activation toast now just says "Project activated." (the "Estimate comes in Phase 2" note is gone) in English, Roman Urdu and Urdu.
- Printing any page leaves out the top bar, side menu and footer and prints the whole page instead of the visible part.

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
- A user who can't see contract values can save a first contract.
- Running bills on a full / grey contract can now be billed (the rate per sq ft is kept and asked for).

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
