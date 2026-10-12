# Changelog

All notable changes to the construction web app. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Adding an entry:** write a short, user-facing line under **Unreleased**, in the right group (Added / Changed / Fixed / Removed). On release, rename Unreleased to the date.

## [Unreleased]

_Nothing yet._

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
