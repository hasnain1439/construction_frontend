# MASTER DESIGN BRIEF — Construction Management Platform (Desktop Web App)

Design a polished, modern desktop web app (1440×900 frames, plus full-page scroll where needed) for a multi-tenant construction management SaaS used by building contractors in Pakistan. Build ONE connected, WORKING, clickable prototype. Use one consistent design system across every frame.

Build in rounds, always reusing the same components. Section 0 applies to every round.
- Round 1 = sections 1–6 (style, shells, dashboard)
- Round 2 = sections 7–8 (Sales, Projects, New Project)
- Round 3 = section 9 (Materials, Purchases, Store, Dispatch, Site receiving)
- Round 4 = sections 10–11 (Team, Settings, Price List, Subscription)
- Round 5 = sections 3–4 (public screens, Super Admin)
- Round 6 = sections 12–14 (PM view, states, flows)

---

## 0. WORKING PROTOTYPE RULES (apply to every screen)

This must be a WORKING, interactive prototype — not static pictures. Build it as one connected app with in-memory state (no backend needed), seeded with the sample data in section 2. Every visible control must do something real.

### A. No dead buttons
- Every button, link, menu item, card, row, tab and icon must navigate somewhere, open a form, change state, or show feedback.
- If a page is out of scope for the current round, the click must still open a simple page with its title, breadcrumb and an empty state ("This page is coming in the next round") — never a dead click.
- Rail items open their flyout; flyout items open their page; "← All projects" returns to company mode; breadcrumbs are clickable.

### B. Every "Add / New / Create / Edit" opens its real form with ALL fields
- Clicking any create or edit action opens the correct form (full page, tabbed page, or slide-over as specified) showing EVERY field listed in this brief for that form — labels, placeholders, required * markers, helper text, dropdown options, toggles and default values.
- Dropdowns open and list real options from the sample data (clients, projects, suppliers, materials, PMs, categories).
- Conditional fields appear/disappear live (Basement ON → Basement height; Contract type Labor-Only → Rate per sq ft replaces Contract value; Payment "Part now" → Paid now + Paid from; Delivered to "Directly to site" → project dropdown; "+ New client" → client name and phone).
- "+ Add row" buttons (rooms, openings, floors, purchase items, dispatch items, payment stages) really add a new editable row; the remove icon really removes it.

### C. Tabbed forms really work (example: New Project)
- Clicking "New Project" (from the rail flyout, All Projects page, "+ Create" menu or a won quote) opens the New Project page on Tab 1.
- All 6 tabs show their full field sets exactly as specified in section 8.3.
- "Next" validates the current tab, marks it with a green check and moves on; "Back" returns; clicking a completed tab jumps to it. A tab with missing required fields shows a red dot and inline errors.
- Tab 5: "+ Add room" adds a room card, "Copy floor" duplicates rooms to another floor, openings rows add/remove, and floor/wall/net-wall numbers recalculate as you type.
- Tab 6 Review shows a summary built from what was actually entered in tabs 1–5, plus live warnings.
- "Save as draft" saves and shows a toast; "Create project" adds the project to All Projects and the project switcher, then opens it in Project mode.

### D. Live calculations everywhere
Typing updates results immediately: plot area (Marla × standard, front × depth), payment schedule total with the "100% ✓ / 95% — must be 100%" chip, rate × covered area, room areas, purchase line amounts and totals, supplier balance after purchase, quote price and price per sq ft when margin changes, dispatch available-stock checks, receiving differences (short / damaged / extra).

### E. Saving changes the app
- Saving closes the form, shows a success toast, and the new or edited item appears at the top of its list with the correct status badge.
- Status actions really change state: Mark quote Won/Lost, Approve/Reject payment slip, Dispatch → "On the way", Confirm receipt → "Received" / "Received with shortage", Resolve shortage → "Resolved", Deactivate member → "Inactive", Cancel invite → "Cancelled".
- Related numbers update: a new purchase increases Store Stock and the supplier's udhaar; a dispatch moves quantity to "In transit"; a confirmed receipt increases Site Stock and creates a Shortage when counts differ; KPI cards and badges (Pending Approvals, Incoming Material, notifications) update.
- Destructive actions (deactivate, cancel, log out device, archive) open a confirm dialog first.

### F. Validation and feedback
- Required field empty → inline red error under the field; Save is blocked with a message.
- Business-rule errors: end date before start date, payment schedule not 100%, dispatch more than available stock, counted less than challan without a note, duplicate phone or transaction ID.
- Every save, send, approve and delete gives a toast. Loading states use short skeletons.

### G. Global controls work
- "+ Create" menu items open their forms. Search (Ctrl+K) opens a command palette that finds pages, projects, suppliers and materials from the sample data.
- Project switcher changes the current project and the pages update.
- Light/Dark toggle switches theme. Language pill switches main-menu labels between English and Roman Urdu.
- Filters, date-range chips, search boxes, Board/Table and Cards/Table toggles really filter and switch views.
- A "View as" switch in the avatar menu (Thekedar / PM) re-renders menus and hides financial data for PM.

### H. Quick map: button → what opens
- New Project → full-page 6-tab form (8.3)
- New Quote → two-panel quote builder (7.2); Mark as Won → New Project pre-filled
- New purchase → purchase form (9.2); Create return → return slide-over (9.3)
- Dispatch to site → dispatch slide-over (9.5); Receive → receiving page with blind count (9.6); Resolve → shortage slide-over (9.7)
- Add material → material slide-over (9.1); Add category → category dialog (11.3); inline rate edit in Price List
- Invite member → invite slide-over (10.2); member row → Edit member slide-over (10.5)
- Upload payment slip → slip slide-over (11.6)
- Create company (Super Admin) → company slide-over (4.3); payment row → slip review (4.5)
- Footer: Record Payment, Log Stoppage, Add Daily Log, Dispatch to Site → their forms (slide-overs with the fields named in this brief)

### I. Self-check before finishing each round
Click through every button on every frame of the round. If any click does nothing, or any form is missing fields from this brief, fix it before presenting.

---

## 1. Visual style
- Font: Inter. Body 14px (never below 12px), page titles 24px semibold, card/section titles 16px semibold, KPI numbers 30px semibold. High text contrast.
- Page background #F5F6FA; white cards with 12px radius, very soft shadow, light #E2E8F0 borders where needed; 8px spacing grid.
- Primary #2563EB (blue) for actions, active states and KPI numbers. Secondary accent amber #F59E0B. Status always colour + icon + label: green = active/on track/paid/received, amber = trial/pending/at risk/on the way/shortage, red = delayed/overdue/expired/rejected/missing, grey = inactive/locked/cancelled/draft.
- Outline line icons (Lucide/Tabler style): 28–32px in the rail, 40px on KPI cards, 16–20px elsewhere.
- Pill-shaped buttons. shadcn/ui-style components: pill badges, clean tables with hover rows, slide-over panels (480 / 640px), confirm dialogs, toasts, inline red field errors, required fields marked with a red *.
- Light and dark mode. No blueprint styling, no crosshair marks, no condensed fonts, no code-style labels.

## 2. Roles and sample data
Roles (only these four):
- Super Admin — platform owner; separate admin console with a neutral platform logo.
- Thekedar — company owner/admin; sees everything in the company, including the central store.
- PM (project manager) — sees only assigned projects; contract value, billing, profit and rates hidden unless allowed.
- Munshi (site supervisor) — mobile app with phone OTP; not designed here except the invite flow.
Homeowner clients have NO login; they only receive PDFs on WhatsApp.

Sample data:
- Platform: 142 companies, MRR Rs 11.85 L, 7 payments awaiting approval.
- Company "Malik & Sons Builders", Lahore, NTN 1234567-8, region Punjab/KP, Marla standard 225, Professional plan (Rs 9,500/month · 5 active projects · 10 office users), renews 14 Oct 2026.
- People: Thekedar Khalid Malik (+92 300 1234567), PM Bilal Ahmed, Munshis Rafaqat Ali and Asif Mehmood.
- Projects: DHA Phase 6 · 10 Marla (client Ahmed Raza, Rs 1.92 Cr, 46%, At risk) · Johar Town · 5 Marla (Rs 1.10 Cr, 81%, Delayed) · Bahria Town · 1 Kanal (Rs 3.40 Cr, 22%, On track).
- Store: "Central Store, Thokar". Suppliers: Al-Madina Cement Agency, Ittefaq Steel Traders, Chaudhry Bricks Kiln, Bilal Traders (sand), Punjab Shuttering Yard.
- Money in PKR with lakh/crore. Site terms: Hazri, Peshgi, Site Kharcha, Udhaar, Challan, Maal Aaya, Maal Lag Gaya, Godown.

---

## 3. Public screens (no login)
1. Company signup — split layout: left product pitch; right form: Company name *, Owner name *, Phone * (+92), Email, Password * (strength hint), Region * (Punjab/KP bricks · Karachi/Sindh blocks), Marla standard (225 / 272.25). Note "14-day free trial, 1 project, no card needed". Error "This phone is already registered".
2. Login — tabs "Email or phone + password" and "Phone OTP"; remember me; forgot password. Errors: wrong password, too many attempts (wait 15 min), company suspended.
3. OTP — 6 code boxes, 5:00 countdown, "Resend in 60s".
4. Forgot password and Reset password (code + new password).
5. Accept invitation — "Malik & Sons Builders invited you as Project Manager", logo, role badge, assigned projects, set-password form; Munshi variant "Continue with phone OTP"; expired/cancelled state "Ask your Thekedar for a new link".

## 4. Super Admin console (separate shell, neutral platform logo)
Sidebar: Overview · Companies · Payments (badge 7) · Plans · Materials Catalog · Rulebook · Holiday Calendar · Communication · Security · System Settings. Footer card "All systems normal · Uptime 99.97%".
1. Overview — KPIs (Active companies, MRR, Payments awaiting approval, Trials ending this week, Read-only), 12-month MRR line chart, plan donut, service health list (API, Sync, SMS gateway, PDF service), recent activity.
2. Companies — table: Company, Owner, City, Plan, Status (Trial / Active / Grace / Read-only / Suspended / Closed), Projects used/limit, Renewal; filters (status, plan, city, renewing before); "Create company".
3. Create company slide-over (640px): Company (Name *, Slug auto-editable, Phone *, Email, NTN, Address, Region *, Marla standard) · Owner (Name *, Phone *, Email; helper "Owner sets their own password via an invite link sent by SMS/WhatsApp. You never see it.") · Subscription (segmented Trial / Paid; Trial → trial days 14 + plan; Paid → plan + method JazzCash/Easypaisa/Raast/IBFT, transaction ID, amount, paid on) · Note. Success screen: owner invite "Pending · expires in 7 days", Resend invite / View company.
4. Company detail — status + actions (Extend trial, Change plan, Set read-only, Reactivate, Suspend); cards: profile, owner (invite status), usage (projects, office users, munshis, storage), subscription, recent payments, timeline.
5. Payment approvals — queue: Company, Plan, Amount, Method, Transaction ID, Submitted, duplicate-warning icon; slide-over with slip screenshot zoom, expected vs paid, red banner for reused transaction ID, Approve (activates 30 days) / Reject (reason required).
6. Plans — Starter Rs 4,000 · Professional Rs 9,500 · Enterprise Rs 20,000 cards with limits and features; edit.
7. Materials Catalog (platform default) — groups (Cement & Binders, Bricks & Blocks, Steel, Aggregates, Waterproofing, Plumbing, Electrical, Flooring & Walls, Sanitary, Woodwork, Paint) with materials: name, unit, unit detail (1 bag = 50 kg), supply category (Grey structure / Finishing), "Used by rulebook" badge, status. Every new company gets this catalog automatically.
8. Rulebook — versions (v1.3 Published, v1.4 Draft), region tabs (Punjab/KP bricks · Karachi/Sindh blocks), parameter table (Parameter, Value, Unit, Safe min, Safe max), Marla standard, Publish with change summary.
9. Holiday calendar — year view (Eid-ul-Fitr, Eid-ul-Adha 7–10 days, Ramadan partial days, Ashura, 14 August); add/edit slide-over.
10. Communication (Announcements, Support tickets) and Security (Platform admins, Audit log, Login attempts) — simple list pages.

---

## 5. Company app shell (Thekedar / PM)

Top bar (white, ~80px): hamburger (collapses rail) · round blue search button + "Search menu…" (Ctrl+K, recent pages) · language pill (English / Roman Urdu / اردو) · company logo CENTERED · right: blue "+ Create" pill (New project · New quote · New purchase · Dispatch to site · Record payment · New change order), dark-mode toggle, apps grid, notification bell (badge 4), fullscreen, "Malik & Sons / Khalid Malik" + avatar (avatar menu includes "View as: Thekedar / PM").

Left icon rail (white, ~112px): large outline icon with the label UNDER it, thin dividers; active = blue text + 4px blue left bar. Two modes:
- Company mode (default): Dashboard · Projects · Sales · Suppliers & Stock · Workforce · Equipment · Finance · Reports · Team · Settings
- Project mode (after opening a project): "← All projects", project name "DHA Phase 6 · 10 Marla" + status badge, then Overview · Planning · Schedule · Site · Labor · Cash Book · Change Orders · Billing · Control · Documents & Closeout

Flyout sub-menu (~300px beside the rail, rounded right corners, soft shadow, small vertical-dots handle per item, generous spacing):
Company mode:
- Dashboard: Company Overview · My Approvals · Alerts & Notifications
- Projects: All Projects · New Project · Closed & Archived
- Sales: Quote Pipeline · New Quote · Clients (Owners) · Win / Loss Insights
- Suppliers & Stock: Purchases (Maal Kharida) · Purchase Returns · Store Stock · Dispatches (Sent to Sites) · Shortages · All Suppliers · Supplier Ledger (Khata) · Purchase Orders · Supplier Payments
- Workforce: Workers Directory · Sub-contractors · Labor Rates
- Equipment: Allocation Map · Owned Equipment · Rentals · Movements · Loss & Damage · Shuttering Demand
- Finance: Receivables · Cash Flow Outlook · Profit & Loss · Cash Floats Overview
- Reports: Project Summary · Material Audit · Labor & Peshgi · Cash Book · Supplier Ageing · Delay Analysis
- Team: Members · Invitations · Devices
- Settings: Company Profile · Materials · Price List · Labor Rates · Rulebook · Payment Templates · Holidays · Alerts & Limits · Tax · Subscription
Project mode:
- Overview: Project Summary
- Planning: Site Setup · Floors & Rooms · Supply Split · Estimate (BoQ) · Estimate Revisions · Owner Shopping List
- Schedule: Gantt · Milestones & Quotas · Stoppage Days
- Site: Daily Logs & Photos · Incoming Material (badge count) · Deliveries (Maal Aaya) · Material Usage (Maal Lag Gaya) · Site Stock · Stock Counts & Transfers · Equipment on Site
- Labor: Hazri Register · Sub-contractor Accounts · Work Measurements · Peshgi · Weekly Settlements
- Cash Book: Site Kharcha · Cash Floats · Top-up Requests · Cash Counts & Handover
- Change Orders: All Change Orders · New Change Order
- Billing: Payment Schedule · Invoices & Running Bills · Payments Received · Owner Statement
- Control: Material Variance · Cost Variance · Burn Rate vs Progress · Delay Analysis
- Documents & Closeout: Drawings · Snag List · Handover · Retention

Sticky footer (always visible): left pills — grey "New Quote", grey "Add Daily Log", blue "Record Payment", amber "Log Stoppage", outline "Dispatch to Site"; right "Construction Platform v1.0", "Docs", green pill "All synced" (variant amber "12 entries syncing").

Right-edge floating tab (magic wand): Light / Dark, Rounded / Flat, Keyboard shortcuts (Alt+N New project, Alt+B New purchase, Alt+D Dispatch, Alt+L Daily log, Alt+P Record payment, Alt+S Search).

Every list page uses one pattern: title + breadcrumb, "+ Add" pill on the right, one joined filter bar with a DATE RANGE, table, pagination (page selector, prev/next, items per page).

## 6. Dashboard (Company Overview)
Header "Dashboard" + breadcrumb "Home | Dashboard".
Filter bar: [Project ▾] [Stage ▾ Foundation / Grey structure / Finishing…] [Date range 01/09/2026 – 30/09/2026 + chips Today · This week · This month] [search].
KPI row 1 — 3 icon cards (icon top, grey label, big blue number): Active Projects 3 (1 at risk · 1 delayed) · Milestones Completed 14 (this month) · Pending Approvals 7.
KPI row 2 — 3 cards: Receivables Rs 32.4 L (ring 72% collected) · Supplier Udhaar Rs 11.8 L (ring 38% paid, oldest 38 days) · Store Stock Value Rs 18.6 L (2 dispatches on the way).
Projects Summary table: Project · Contract · Progress bar · Budget spent % · Received · Outstanding · Own money invested · Next milestone · Status.
Two-column section — Left: "Site Stats" chips (Hazri today 38 · Peshgi this week Rs 12,500 · Site Kharcha Rs 6,850 · Deliveries 4 · Stoppage days 0); "Labor Analysis" (Mistri 9 · Mazdoor 24 · Sub-contract teams 3 with weekly wages). Right: "Payment Analysis" by method (Cash · Bank · Cheque cleared/pending/bounced · JazzCash · Easypaisa); "Alerts" with action buttons (Cement overuse +62 bags → View variance · Shortage on GP-0142: 10 bags cement → Resolve · Unpaid ground-slab stage → Open billing · Udhaar ageing 38 days → View supplier); "Delay Analysis" donut (Owner 12 · Excusable 8 · Contractor 5 days).

---

## 7. Sales (Quotations) — Company mode
Sales comes before Projects: quoting happens before a project exists; a won quote becomes a project.
1. Quote Pipeline — filter bar [Search client/plot] [Category ▾] [Contract type ▾] [Date range]; Board / Table toggle. Columns Draft · Sent · Negotiation · Won · Lost with count and total value. Card: client, plot ("10 Marla · DHA Phase 6"), total (Rs 1.85 Cr), rate per sq ft (Rs 4,680), category badge, revision ("Rev 2"), validity chip (green "Valid 6 days" / amber "Expires tomorrow" / red "Expired"), PM avatar. Lost cards show reason chip (Competitor cheaper · Client postponed · Self-build). Sample: 4 Draft, 6 Sent, 3 Negotiation, 5 Won, 4 Lost.
2. New Quote (two panels). Left inputs: Client * (+ New client: name *, phone *), Plot location; Plot unit *, Plot size *, Marla standard *, Covered area *, Floors * (chips Ground / 1st / 2nd / Mumty), Basement, Structure type *; Contract type *, Quality category * (company's own Price List categories), compact supply split; Target margin % slider (0–30, default 15), Payment schedule template, Valid until * (default +15 days). Right live result tabs: "Internal view" (cost breakdown: materials, labour, equipment, overheads, contingency; material quantities; margin; final price; price per sq ft; lock label "Internal — never shown to client") and "Customer PDF" (A4 preview: letterhead and logo, client, date, quote no. Q-2026-031, total, rate per sq ft, scope, material specifications by category, payment schedule = 100%, validity, terms, signature line). Footer: Save draft · Save & send (WhatsApp share) · Download PDF.
3. Quote Detail — header "Q-2026-031 · Ahmed Raza · 10 Marla DHA Phase 6", status + validity. Actions: Save revision · Share on WhatsApp · Download PDF · Mark as Lost (asks reason) · green "Mark as Won → Create project". Tabs: Internal View · Customer PDF · Revisions (Rev 1 Rs 4,500/sq ft → Rev 2 Rs 4,300/sq ft "Accepted by client"; Compare side-by-side diff) · Activity. Expired banner "Prices may have changed — Recalculate with current rates." Mark as Won → confirm → New Project opens with all 6 tabs pre-filled and banner "Filled from Won quote Q-2026-031 — please review."
4. Clients (Owners) — table: Name · Phone · City · Quotes · Projects · Total contract value · Last activity; "+ New client"; client detail with note "Receives PDFs on WhatsApp" and tabs Quotes · Projects · Statements.
5. Win / Loss Insights (Thekedar only) — KPIs (Win rate 42% · Quotes this month 22 · Avg rate quoted Rs 4,520 · Avg rate won Rs 4,310), win/loss by month bars, loss reasons donut, win rate by category, "Quotes needing follow-up" list.

## 8. Projects
1. All Projects — "+ New project"; filter bar [Search] [Status ▾ Active / Closeout / Handed over / Closed] [Contract type ▾] [PM ▾]; Cards / Table toggle. Card: name, client, address, contract type badge, progress %, budget health bar, next milestone + date, status, PM avatar. Click → Project mode.
2. Project mode — Project Summary: stage-wise progress, three deadline cards (Original · Revised · Projected), contract & billing card (Thekedar only), recent site photos, latest Munshi logs; rail switched with the "Planning" flyout open.
3. New Project / Edit Project — FULL PAGE (not a small modal). Header "New Project" + breadcrumb "Projects | New Project"; right: "Save as draft" (outline) and "Next" / "Create project" (blue). Numbered tab bar: 1 Basic Info · 2 Contract & Supply · 3 Plot & Structure · 4 Coverage & Boundary · 5 Floors & Rooms · 6 Review. New project: tabs in order with Next/Back, completed tabs get a green check. Edit: open any tab directly. A tab with errors shows a red dot. Fields grouped under small headings in a 2–3 column grid; sticky footer Back · Save as draft · Next.
   - Tab 1 Basic Info: Project name * · Contract reference (auto MSB-2026-014, editable) · Client * (searchable + "+ New client": name *, phone *) · Site address * · City * · Start date * · End date * (error if before start) · Project Manager · Munshi.
   - Tab 2 Contract & Supply: Contract type * (3 cards: Full Contract · Grey + Owner Finishing "Most common" · Labor-Only); "Who supplies what" table: Category | Supplied by (Contractor/Owner toggle) | Quality category (company categories; "—" when owner-supplied) for Cement · Bricks · Steel (Sarya) · Sand & Bajri · Electrical & plumbing pipes (amber "often changes" tag) · Tiles & Marble · Sanitary fittings · Woodwork · Paint · Electrical fittings; Contract value * (Full / Hybrid) or Rate per sq ft * (Labor-Only, live total "450 × 3,950 sq ft = Rs 17,77,500"); Billing model * (Stage schedule / Running bills); Payment schedule * template + editable list (Stage | % | Amount auto): Advance 15 · Plinth/DPC 15 · Ground slab 20 · 1st floor slab 15 · Brickwork & mumty 10 · Plaster 10 · Finishing 10 · Retention 5 with live chip "100% ✓" (error "95% — must be 100%"); Retention defect period * (6 months).
   - Tab 3 Plot & Structure: Plot unit * (Marla / Kanal / Sq ft) · Plot size * (10) · Marla standard * (225 / 272.25) · Front * (35 ft) · Depth * (65 ft) · Corner plot; live result card "10 Marla = 2,250 sq ft · 35 × 65 = 2,275 sq ft" (amber warning if very different). Structure type * (cards: Framed / Load-bearing) · Basement toggle → Basement height · Floors list builder with drag handles and "+ Add floor": Ground 11 ft · 1st 10 ft · Mumty 9 ft.
   - Tab 4 Coverage & Boundary: Covered area * (3,950) · Semi-covered / car porch (180) · Open area (420) with a small split bar; Boundary wall toggle → Length * (200 running ft) · Height * (7 ft) · Thickness * (4.5" / 9") · Plaster * (One side / Both sides).
   - Tab 5 Floors & Rooms: floor sub-tabs (Ground · 1st · Mumty) + "+ Add room" + "Copy floor". Room cards: Room type * (Master Bedroom, Bedroom, Attached Bath, Powder Room, Kitchen, TV Lounge, Drawing Room, Dining, Store, Terrace, Stair, Garage) · Room name · Length * · Width * · Height * (pre-filled from floor) · Wet/Dry badge (auto for bath & kitchen, overridable). Openings mini-table: Type * (Door / Window / Ventilator) · Width * · Height * · Qty * · remove + "+ Add opening". Card footer live calc: Floor 224 sq ft · Wall 660 · Openings −44.5 · Net wall 615.5. Sticky right summary: rooms per floor, total room area vs covered area.
   - Tab 6 Review: summary cards (project & client, contract & payment schedule 100% ✓, plot & structure, coverage & boundary, rooms per floor, supply split chips); amber warnings (e.g. "Room areas total 3,610 sq ft but covered area is 3,950 sq ft — check walls and passages"); buttons Save as draft · "Create project & generate estimate". Success toast "Project created · Estimate Rev 1 (Draft) generated" → Project mode → Planning → Estimate (BoQ).

---

## 9. Materials, Purchases, Store & Site receiving
The full journey of every bag of cement: bought from a dealer → into the store (or straight to a site) → dispatched to a site → counted and received on site → used.

1. Settings → Materials (company catalog)
   Grouped table (collapsible groups): Material · Unit · Unit detail (1 bag = 50 kg) · Other units (1 ton = 1,000 kg; 1 trolley ≈ 100 cft) · Supply category (Grey structure / Finishing) · Source badge ("Platform" / "Company") · Status (Active / Hidden). Actions: "+ Add material" slide-over (Name *, Group *, Sub-group, Unit *, Unit detail, Other units, Supply category *), Hide/Show. Materials already used cannot be deleted — tooltip "Used in estimates and stock. You can hide it instead."

2. Suppliers & Stock → Purchases (Maal Kharida)
   List: Date · Challan no. · Supplier · Delivered to (Central Store / project) · Items · Total (Rs) · Payment (Udhaar / Cash / Partial) · Status · attachments icon. Filters: supplier, location, payment type, date range. "+ New purchase".
   New purchase page:
   - Header: Supplier * (searchable + "+ New supplier") · Delivered to * (segmented: Central Store / Directly to site → project dropdown) · Date * · Challan / bill no. * · Vehicle no. · Linked purchase order (optional, shows ordered vs pending).
   - Items table: Material * · Challan qty * · Counted qty * · Unit · Rate * (pre-filled from supplier's agreed rate, editable) · Amount (counted × rate). Row warning when counted < challan ("10 bags short — note required" + note field). "+ Add item". Totals row.
   - Payment: segmented Udhaar / Cash now / Part now + rest udhaar → Paid now (Rs) · Paid from (Office cash / Bank / Cheque / JazzCash).
   - Proof: Challan photo * (upload with thumbnail), Bill photo, Note.
   - Right summary card: Total Rs 11,42,000 · Paid Rs 2,00,000 · Added to Al-Madina udhaar Rs 9,42,000 · Supplier balance after Rs 16,82,000.
   - Save. After save the record is locked; detail page shows "Create return" and "Correction". Direct-to-site purchases appear on that site's "Incoming Material" for the PM to count and confirm.

3. Suppliers & Stock → Purchase Returns
   List + "New return" slide-over: Purchase (challan) * · Material * · Qty * · Reason * (Damaged / Wet / Wrong item / Extra) · Photo · Note. Shows effect: "Store stock −15 bags · Al-Madina udhaar −Rs 21,450".

4. Suppliers & Stock → Store Stock (Central Store, Thokar)
   KPI strip: Stock value Rs 18.6 L · Low-stock items 3 · On the way to sites 2 dispatches.
   Table: Material · In store · In transit · Average rate (weighted, e.g. Rs 1,453/bag) · Stock value · Last purchase · Low-stock indicator. Row click → movement history slide-over (Purchase +400 · Dispatch GP-0142 −200 · Return −15 …). Buttons "Dispatch to site" and "Stock count".

5. Suppliers & Stock → Dispatches (Sent to Sites)
   List: Gate pass no. (GP-0142) · Date/time · From · To project · Items · Vehicle · Driver · Status (Draft / On the way / Received / Received with shortage / Received with excess / Cancelled) · Received by. Filters: project, status, date range.
   New dispatch slide-over (640px): From * (Central Store) · To project * · Items table (Material *, Qty *, available stock shown beside each, error if more than available) · Vehicle no. * · Driver name * · Driver phone * · Dispatch date/time (auto) · Photo of loaded vehicle · Note. Button "Dispatch". Success: "GP-0142 on the way · PM Bilal notified". Cancel allowed only before receipt.

6. Project mode → Site → Incoming Material (PM / Munshi)
   List of dispatches and direct purchases on the way to this site, with status and "Receive" button.
   Receive page: header "GP-0142 from Central Store · Vehicle LES-4521 · Driver Nadeem" and a note "Blind count: count first — sent quantities are revealed after you enter your count."
   Items table: Material · Counted qty * · Damaged qty · Note (required if short) · Photo. After entering counts, columns reveal Sent qty and Difference: green "Complete", amber "−10 short", orange "200 damaged", blue "+5 extra".
   Overall note + "Confirm receipt". Confirmation dialog summarises: "Site stock +190 bags cement, +4,800 bricks. Shortage reported to Thekedar." After confirming, the dispatch is locked; later fixes only via a visible "Correction".

7. Suppliers & Stock → Shortages (also in Dashboard → My Approvals)
   List: Gate pass · Project · Material · Short / Damaged / Excess qty · Value (Rs, at average rate) · Reported by · Date · Status (Open / Resolved).
   Resolve slide-over: Decision * (Send remaining → creates new dispatch · Return to store stock · Accept as loss → charged to project · Recover from driver/transporter → amount), Note *, then status Resolved with who/when.

8. Project mode → Site → Site Stock
   Table: Material · Received (dispatches + direct purchases + owner-supplied) · Used · Transferred out · In stock · Last count. Munshi sees quantities only (no rates).

Role rules shown in UI: only Thekedar sees Store Stock, creates dispatches, resolves shortages and sees rates; PM can record direct-to-site purchases, receive and count; Munshi can receive and count but never sees rates.

---

## 10. Team (Company mode → Team)
1. Members — usage hint "4 of 10 office users (Munshis don't count)"; table: Name + avatar · Phone · Role badge · Projects chips · Sees financials (PM) · Status · Last active; filters role / status / project; "Invite member".
2. Invite member slide-over — Name *, Phone *, Email, Role * (PM / Munshi radio cards with one-line descriptions), Projects (multi-select), toggle "Can see contract value, billing & profit" (PM only). Errors: plan limit reached (+ "Upgrade plan"), phone already in company / invite pending.
3. Invitations — Name, Phone, Role, Projects, Status (Pending / Accepted / Expired / Cancelled), Sent, Expires; Resend, Cancel.
4. Devices — User, Platform (Windows / Android), Model, Last active, Last sync, Pending uploads; "Log out device" with confirm ("Use this if a phone is lost").
5. Edit member slide-over — "Where they work" (project multi-select; helper "This replaces their full project list"), "What they can do" (role, Can see financials; warning when Munshi → PM uses a seat), "Details" (name, phone); Danger zone "Deactivate member" (confirm: devices logged out, past entries kept; blocked state "Rafaqat holds Rs 12,000 in site cash. Hand over the cash balance first.").

## 11. Settings (Company mode → Settings)
1. Company Profile — name, NTN, logo upload with preview, address, phone, email, region, Marla standard (note "Region and Marla changes apply to new projects only"); letterhead preview as it appears on PDFs.
2. Materials — see 9.1.
3. Price List — company-created quality categories as tabs ("A+ Premium" · "A Standard" · "B Economy" · "+ Add category" dialog: Category name *, Short code *, Description, Copy rates from ▾); tab ⋯ menu Rename · Duplicate · Set as default · Archive. Table grouped Civil/Structural and Finishing: Material · Specification ("Grade-60 deformed bars", "Class-1 clay bricks") · Unit · Rate (inline editable) · Last updated · history icon. Toolbar: search, "Bulk update %", Import/Export Excel, Save changes. Banner after save: "Rates changed. 3 draft estimates and 2 open quotes can be recalculated. Approved estimates keep their old rates." Rate history slide-over (date, old → new, changed by).
4. Alerts & Limits — cards with plain helper text: site kharcha approval limit (Rs), material overuse alert (%), missing log alert time, quote validity (days), PM can see financials (default), default language, blind count on receiving (on by default), low-stock alert levels.
5. Tax — toggle (off by default) with explanation.
6. Subscription — current plan card with status and renewal date; usage bars (projects 3/5, office users 4/10); plan comparison (Starter Rs 4,000 · Professional Rs 9,500 · Enterprise Rs 20,000); "Upload payment slip" slide-over (method, transaction ID, amount, paid on, screenshot); payment history (Amount, Method, Transaction ID, Status, Period, Receipt PDF); downgrade flow choosing which projects stay active; banners for grace period ("Renew within 3 days") and read-only ("Records are read-only until renewal is approved").

---

## 12. PM view
Same shell as seen by PM Bilal Ahmed: only his assigned projects in the switcher; no Finance, Team, Settings, Store Stock, Dispatches or Win/Loss items (hidden, not greyed out); billing, profit, margin and rates replaced by a subtle "Hidden for your role" placeholder; Incoming Material badge visible on his site.

## 13. States to design
Empty states (no projects yet, with onboarding checklist: add logo, invite team, add materials & rates, create first project), loading skeletons, success toasts ("Invite sent to Bilal"), read-only banner, 402 plan-limit dialog, expired invite page, payment schedule 95% error, end date before start date, red dot on a tab with errors, dispatch quantity more than available stock, counted less than challan without a note, offline "12 entries syncing" footer.

## 14. Prototype flows (must be clickable end to end)
1. Signup → OTP → empty dashboard with onboarding checklist.
2. Super Admin: Companies → Create company → success → Company detail; Payments → Slip review → Approve → company Active.
3. Sales → New Quote → Customer PDF → Mark as Won → New Project pre-filled → Review → Create → Estimate.
4. Projects → New Project tabs 1–6 → Create → project appears in All Projects; open it → Project mode → "← All projects".
5. Purchase: Suppliers & Stock → New purchase (Central Store, udhaar) → Store Stock increases → supplier balance updated.
6. Dispatch: Store Stock → Dispatch to site (GP-0142) → PM notification → Project mode → Incoming Material → blind count → 10 bags short → Confirm → Shortages → Resolve (Send remaining).
7. Team → Invite member → Invitations (Pending) → Accept invitation → PM first-login view; Members → Edit member → Deactivate (blocked cash state).
8. Settings → Price List → edit rate → "Rates changed" banner; Subscription → Upload slip → history "Pending review".

## 15. Deliverable frames
- Round 1: (1) Dashboard default · (2) Dashboard with Suppliers & Stock flyout · (3) Dashboard lower section · (4) Dark mode dashboard.
- Round 2: (5) Quote Pipeline · (6) New Quote internal view · (7) New Quote customer PDF · (8) Quote Detail revisions compare · (9) All Projects · (10) Project mode Summary with Planning flyout · (11–16) New Project tabs 1–6 · (17) Won quote → pre-filled New Project.
- Round 3: (18) Settings → Materials · (19) Purchases list · (20) New purchase with short row + summary card · (21) Purchase return slide-over · (22) Store Stock + movement history · (23) New dispatch slide-over · (24) Dispatches list · (25) Incoming Material list · (26) Receive page before reveal (blind count) · (27) Receive page after reveal with shortage · (28) Shortages + Resolve slide-over · (29) Site Stock.
- Round 4: (30) Team members · (31) Invite slide-over · (32) Edit member + deactivate blocked · (33) Company Profile · (34) Price List + rates-changed banner · (35) Add category dialog · (36) Subscription.
- Round 5: (37) Signup · (38) Login + OTP · (39) Accept invitation · (40) Super Admin Overview · (41) Companies · (42) Create company · (43) Company detail · (44) Payment approval slide-over · (45) Platform Materials Catalog · (46) Rulebook · (47) Holiday calendar.
- Round 6: (48) PM view dashboard · (49) Error and empty states sheet · (50) Win / Loss Insights · (51) Clients list + detail.
