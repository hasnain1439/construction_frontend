# Changelog

All notable changes to the construction web app. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> **Adding an entry:** write a short, user-facing line under **Unreleased**, in the right group (Added / Changed / Fixed / Removed). On release, rename Unreleased to the date.

## [Unreleased]

### Company trades and per-unit contracts (11 Nov 2026)

- **Added:** Labour rates → **Add trade**: a sub-contract trade of the company's own with names in three languages and a default rate. The sub-contractor form, list and filter show the company's trades.
- **Added:** Assign sub-contract → paid **Per unit (your own)**: write the unit (point, room …); the rate and measurements use it.

### Office PC sync badge (6 Nov 2026)

- **Fixed:** the footer's "All synced" was fixed text. On an office PC it now follows the sync agent: all synced, offline, entries waiting, syncing or a sync problem.
- **Added:** the time of the last sync next to it on an office PC.

### Platform payment accounts (6 Nov 2026)

- **Added:** platform admin → Payment Accounts: add, edit, close and reopen the bank and wallet accounts companies pay their subscription into. They sit in groups the admin makes (Manage groups), with a tab per group.
- **Changed:** Upload payment slip shows those accounts with title, number and IBAN (copy buttons). The company picks a group, then the account it sent the money to. Accounts have no fixed method, so any bank or wallet can be added. With no accounts added, the form asks for the method as before.
- **Added:** "Paid to" (group, account, number) on the admin's payments list and review, the company page and the company's payment history. The admin's Payments screen filters by group and account instead of method.

### Estimate QA re-check integration (QE5 + QE6, 22 Oct 2026)

- **Merged:** `p23/qe5` and `p23/qe6`; both sides kept (the only conflict was this file).
- **Added:** translations for the scaled formulas (`wallsScaled`, `plasterExternalScaled`) and the scale note on a scaled line ("× 2.05 (square root of the area factor …)" for wall runs, "× 1.5 (area factor …)" for areas) in English, Roman Urdu and Urdu.
- **Fixed:** estimate line names and the floor column use the API's plain `label` / `floorLevel` when the app has no translation; a formula value that is an object prints its name, so "[object Object]" cannot appear.
- **Added:** the Review tab shows the blocking "No price-list rate for: …" error on tab 2, naming the materials, with an "Open price list" link (QA B-26). The estimate's RATES_MISSING warning now says it blocks the estimate.
- **Fixed:** "How the estimate is calculated" prints the factors the estimate used (bricks per cft, mortar per cft, dry factors, mix, bag size) instead of the old 0.25 × 1.33; the rulebook text for the mortar dry factor says 1.27.
- API types (`schema.ts`) regenerated from the merged API. `calculations.footprints` stays hand-typed: the API documents it only in examples, so the generated types have no shape for it.

### Estimate QA re-check (QE5)

- **Fixed:** the contingency description in the estimate assumptions and the rulebook says it is a % of the direct cost only (not of direct + overheads), in English, Roman Urdu and Urdu (QA B-14).

### Estimate re-check, web side (QE6)

- **Fixed:** the plot-tab column hint, the footing-count default and the BoQ use one column count: the API count (`calculations.footprints` of the project, else the loaded estimate), else the same 15 ft grid over the same ground footprint (QA B-04). Isolated footings with no typed count take the column count; a typed count that differs is used but explained under the field, and the API warning FOOTINGS_COLUMNS_MISMATCH reads in all three languages.
- **Fixed:** the Coverage tab shows the same ground footprint as the estimate: the full storeys share the covered area equally after the mumty share (not by room area), the API number (`calculations.footprints.groundFootprintSqft`) when present, else the same rule from one shared util (`utils/footprint.ts`) (QA NEW-2).
- **Fixed:** the Assumptions dialog shows the termite chemical as used (0.005 litre / sq ft) with its rule in the hint, and "n changed from the defaults" counts only the fields the dialog shows (QA B-19).
- **Added:** the Assumptions dialog has "Steel laps and hooks" next to the per-material wastage (cement, sand & crush, bricks, steel, other materials), and the how-it-works note lists the rate of each (QA B-20).
- **Fixed:** the Assumptions button stays on the wizard Estimate tab while the estimate is blocked (rooms too few), so the assumptions can be seen and changed (QA B-20).
- **Added:** bar size selects show the inch size under the field ("12 mm (#4, about ½ inch)"; Roman Urdu / Urdu with sooter) (QA B-32).
- Tests for the items the tester could not re-test on a read-only company: contract switch keeps the value, negative input refused, stale stage-total error clears, copy from ground floor, plot mismatch warning, RCC steel footer, grey-structure stages (QA B-18 / 25 / 27 / 29 / 31 / 34 / 35).

### Responsive pass (QA R-01 – R-09, QE7)

- **Fixed:** the project wizard step bar scrolls the active step into view when it opens and on every step change (instantly when the user prefers reduced motion); below 1100 px a compact "Step 6 of 7 · Estimate" header with previous / next arrows sits above it. Translated in English, Roman Urdu and Urdu (R-01).
- **Changed:** tables keep their first column in place and show a soft shadow at the edge while they scroll sideways; admin Companies and Audit Logs get the Projects Cards / Table toggle and open as cards on a phone (R-02).
- **Fixed:** on a phone the dashboard lists its projects as cards and the Billed / Spent bars wrap below 480 px; alert titles show up to two lines instead of one (R-03, R-04).
- **Fixed:** on touch screens buttons, sort headers, breadcrumb links, segmented toggles (Contractor / Owner), selects, switches, checkboxes and tabs have a tap area of at least 40 × 40 px, without looking bigger (R-05).
- **Fixed:** the Plot & Structure, roof and foundation field grids size their columns by the space they have (one column below 420 px, two below 640 px); payment stage rows put the stage name on its own line on a phone (R-06).
- **Fixed:** no text under 12 px — badges, stage dates, dense table headers and chart labels moved from 11 px to 12 px (R-07).
- **Fixed:** the Review tab "Rooms per floor" table scrolls sideways instead of being cut off, and "Who supplies what" shows one two-line card per category on a phone (R-08, R-09).

### Labour-only scope and sparse projects (QE4)

- **Added:** a labour-only contract (Contract tab) has two options, "Include finishing labour (tiles, paint)" and "Include electrical and plumbing labour"; without them the estimate counts grey-structure labour only and shows the left-out lines as the owner's, with no amount.
- **Added:** when the rooms cover under half of the covered area, the wizard Estimate tab, the Planning BoQ, the Review estimate card and the project overview show why and what to add instead of the cost, and "Use as contract value" is hidden; Review blocks activation (ROOMS_TOO_FEW). Translated in English, Roman Urdu and Urdu.
- **Fixed:** the RULEBOOK_RATE_ZERO warning (a rate set to Rs 0) is translated in all three languages and names the rates by their labels.
- API types (`schema.ts`) regenerated (contract `labourScopeIncludesFinishing` / `labourScopeIncludesMep`).

### Estimate geometry (QA audit, QE2)

- **Changed:** steel bars are shown mm-first everywhere ("12 mm (#4)"; Urdu / Roman Urdu with the local sooter size), and the estimate names the new boundary wall, porch, plinth beam, column stub, backfill, cart-away and plinth-fill lines in all three languages.
- **Added:** the boundary-wall length defaults to the plot perimeter minus a 12 ft gate; the new FOOTPRINT_EXCEEDS_PLOT warning is translated.

### Estimate QA integration (QE2 + QE3)

- **Fixed:** the steel norm warning shows the usual range ({min}–{max} kg per sq ft) the API now sends, in all three languages; a duplicate FOOTPRINT_EXCEEDS_PLOT text and duplicate warning type entries are removed.
- API types (`schema.ts`) regenerated from the merged API (estimate settings `foundationMortarMix`, `steelLapPercent`, the new rulebook rate keys, payment template `contractType`); estimate types gain `coverageScale`, `estimatedFromArea` and RULEBOOK_RATE_ZERO.

### QA wave E3 (wizard, Estimate tab, Assumptions)

- **Contract tab:** switching the contract type asks first and says what changes; each type keeps its own value, rate, billing and stages, so switching back restores them (B-18). Running bills hide the stage table and show "x % running bills + y % retention"; switching back restores the typed stages. The retention row follows the retention % and is locked in the stage table; the other stages must add up to 100 − retention, and a stage-total error clears as soon as the stages are fixed (B-08, B-29). Each contract type starts from its own default template, grey structure without flooring / finishing stages (B-35).
- **Number inputs:** a minus sign is never dropped silently; negatives, and values outside a field's bounds, show an inline message with the unit ("Must be at least 7 ft"). Heights are 7–30 ft; ceiling heights and room cells show their own message instead of only a red border; ↑ / ↓ step 0.5 ft. Count fields show "nos" / "bars"; plot size shows its unit (B-27).
- **Plot & structure:** the foundation follows the structure type until edited — RCC frame → isolated pads, one per column (count suggested from a 15 ft grid), L = W; load-bearing → strip (B-04). Roof cards show the worked-out column count next to the hint (B-22). Bars read "12 mm (#4)" / "12 mm (4 sooter)" (B-25). Plot mismatch warning at 2 %, plus "The estimate uses the plot size" (B-34). Roman Urdu / Urdu show short explanations for lenter, chajja, DPC and awwal / doum eent (B-32).
- **Coverage:** covered area is shown as all floors; only the ground footprint + porch + open area is compared with the plot, with a warning when it does not fit (B-24). The boundary wall length starts as 2 × (front + depth) − 12 ft gate (B-30).
- **Rooms:** an empty floor offers "Copy from ground floor" (B-31); pairing a shared wall asks first when the other room's wall there is a party / external / double wall (B-23); "Net wall area" is now "Plaster face" (B-28).
- **Estimate tab:** shows the full BoQ (every section, lump sums, overheads and contingency) with "the lines above add up to the direct cost", the grey-structure working in a collapsed section; each lump-sum / percent line has "Edit rate" (project value, back to the company value) and materials / labour link to the price list / labour rates (B-05). Percent lines say what they are worked out on (B-14). Blocking estimate problems such as FOOTPRINT_EXCEEDS_PLOT show as an error. RCC steel by bar size includes beams, columns and lintels (B-25). Small rates keep their decimals (0.005, B-19).
- **Assumptions dialog:** wastage per material (cement, sand & crush, bricks / blocks, steel, other), site overheads and contingency (% of the direct cost); "n changed" counts every value that differs from the company value (B-19, B-20, B-14). Saving keeps the project's other values (lump-sum rates set from the BoQ).
- Wizard intro says the real number of steps; texts in English / Roman Urdu / Urdu. Tests in `tests/unit/components/QaE3.test.tsx`.

### T-iron + tiles roof

- **Wizard tab 3 → roof card → "T-iron + tiles"** now shows the real build-up as 6 numbered steps, bottom to top: 1 structure (T-iron only / Girder + T-iron, with girder size G6×3 / G8×4 and spacing), 2 T-iron size (3″ / 4″) and spacing (default 1.1 ft = 13″), 3 bottom tile layers (1 / 2), 4 waterproof layer (polythene sheet / bitumen / none), 5 earth inches (default 5″), 6 top finish (tiles in mortar / mud + straw plaster / concrete screed) and its thickness (1″, concrete 2″). Steel grade and the slab fields are hidden; the concrete mix shows only for a concrete finish. Warnings: span over 12 ft with T-irons only, T-irons over 14″ apart, girders over 10 ft apart, no waterproof layer. Old saved T-iron roofs open with the mapped values. Texts in English / Roman Urdu / Urdu; the estimate shows the new lines (girders, T-irons, bottom tiles, waterproof layer, roof earth, top finish), the polythene sheet and mud-plaster lump sum, and the new warnings. Two new estimate settings (roof polythene overlap, roof bitumen). `SegmentedField` takes an optional `onValueChange`. API types (`schema.ts`) regenerated.

### Plain English

- English texts are plain English (no Roman Urdu words); Roman Urdu / Urdu unchanged. The English UI now says advance (peshgi), attendance (hazri), site clerk (munshi), Owner (thekedar), balance owed / on credit (udhaar), site expense (kharcha), delivery note (challan), roof slab (lenter), mason / labourer (mistri / mazdoor), stair room (mumty) and so on. Keys, enum values and API codes are unchanged; a guard test fails if a Roman Urdu word comes back into the English texts.

### Opening balances Excel import

- **Settings → Opening balances → "Import from Excel" (Excel se import karein):** opens the same side panel and steps as the other Excel imports — 1 choose what to import (store stock, supplier udhaar, cash in hand, worker peshgi) and download its template, 2 upload the filled file, 3 check (rows with problems shown per cell, "Import only the N good rows"), 4 done ("N opening balances added"); the list refreshes. Changing the kind clears a file checked for another kind. Needs `company.opening.manage` (hidden in read-only mode). Texts in English / Roman Urdu / Urdu. Tests in `tests/unit/components/OpeningImport.test.tsx`.
- `ImportWizard` takes an optional kind chooser, title, description and done text; the Material / Worker / Supplier / Client / Sub-contractor imports are unchanged.
- API types (`schema.ts`) regenerated for the twelve `/imports/opening-*` routes.

### Developer setup

- **`NEXT_DEV_DISK_CACHE=off`** in `.env.local` turns off the dev server's on-disk Turbopack cache. On a PC short of memory a killed `next dev` left that cache broken (pages hung while compiling, or every Settings page returned 404, until `.next` was deleted). Builds are unaffected.

### Top bar search and Create

- **Fixed: the search (magnifier / Ctrl+K) crashed the page** ("This page couldn't load") as soon as it opened — the cmdk input and list now sit inside `<Command>`. It lists every page the user may open (company menu, the open project's pages and the Create actions), filtered by permissions, and matches whole words of the page name (no loose letter matching); a page under Create is listed once. Tests in `tests/unit/components/CommandSearch.test.tsx`.
- **The Create button moved to the left of the top bar**, next to the search.

### Price list Excel import

- **Settings → Price List → "Excel rates" (Excel se rates):** "Download rates (Excel)" saves every material with today's rate and specification for each quality category (needs the price list view + `fields.rates`); "Upload edited file" checks the file and opens a preview — changes grouped by category with old rate, new rate and the difference (red arrow up / green arrow down, %), specification changes, and the problems in the file (unknown material, not a number, negative, unknown category column, repeated row …) with row and column. Confirm saves (or "save only the changes without problems"), shows "N rates updated" and refreshes the list. Upload needs `masterdata.pricelist.manage`. Texts in English / Roman Urdu / Urdu. Tests in `tests/unit/components/PriceExcelImport.test.tsx`.
- **Same popup as the other Excel imports:** the "Excel rates" menu is replaced by one "Import from Excel" button (Excel se import) that opens the same side panel and steps as the Material / Worker / Supplier import — 1 download the pre-filled price list (only change the numbers, an empty cell means no change), 2 choose the edited file, 3 check (counts changing / unchanged / with problems, the problems, old → new per category), "Import only the changes without problems" (`skipInvalid`), 4 done ("N rates updated", list refreshes). A PM without `masterdata.pricelist.manage` sees the button as "Download rates (Excel)" and the panel shows only the download with a note that the owner/admin uploads; hidden without `fields.rates`. The steps, download, file picker, option checkbox and footer are now exported from `ImportWizard.tsx` and shared by both imports.
- API types (`schema.ts`) regenerated for `GET /price-list/export.xlsx`, `POST /price-list/import/preview` and `POST /price-list/import/commit`.

### Owner decisions (integration)

- **Charging a loss (decisions 3 + 6):** for missing rented pieces the charge form no longer asks for a value; it says they are valued at what the yard bills at the return, whoever charges them. Other losses keep the optional value field, also for users without `fields.amounts` (never shown back). Tests in `tests/unit/components/Equipment.test.tsx`.
- API types (`schema.ts`) and `catalogFixture.json` regenerated from the merged API.

### Owner decisions (1, 2, 5, 6, 7, 8)

- **Finishing allowance line (1):** when the finishing allowance applies (a full contract whose BoQ has no finishing lines), it is shown as its own line — "Finishing allowance — no finishing lines in BoQ" — with its calculation ("Rs 60,00,000 × 30% = Rs 18,00,000") in the contract-from-estimate card (wizard Estimate step and the BoQ page) and the wizard Review estimate card.
- **Revocable share links (2):** every shared document (quote, estimate / BoQ, owner shopping list, change-order slip, invoice, receipt, owner statement, handover certificate) has **Shared links** next to WhatsApp (in the row menu for quotes and receipts): a slide-over with each link's who / when, expiry and status, and **Revoke link** / "Link band karo" with a confirmation. Shown only with the permission that shares the document (`GET /share-links`, `POST /share-links/:id/revoke`). In English, Roman Urdu and Urdu.
- **Optional next steps (5):** the setup checklist shows first quote, estimate, rulebook and equipment, and the rest — schedule, alert limits, change orders, closeout, tax — under a collapsed **Show more**. Each is permission-gated and links to a real page (project steps open the newest project; the navigation test checks every link and its gate).
- **Mark as Won / change-order approval (7, 8):** tests confirm the buttons follow the permissions only — a PM given `sales.quote.approve` sees **Mark as won**; a PM without `changeorder.approve` sees no approve / reject; the role editor lets a company grant / remove both keys.
- API types regenerated (`schema.ts`): `/share-links`, `lid` / 410 on `/public/files/{id}`, `finishingAllowance`, checklist `latestProject`.

### Owner decisions (3, 4)

- **Equipment money follows the closeout rule (decision 3):** hire rates, replacement values, rent, deposits, damage / missing charges, loss values, charges and idle cost show only with `fields.amounts` (was `fields.rates`) — on the register, Equipment on Site, rentals list + detail, losses, charges and the idle panel. Without it a user may still enter money as part of an action they are allowed to do — "Hire equipment" (`equipment.rental.manage`) with rent per day and deposit, damage / missing charges on return, deposit refund on close, a loss value on charge — but never sees it back; only the register's hire rate / replacement value inputs (master data) are hidden; nothing breaks when the API leaves the values out.
- **Munshi daily wage toggle (decision 4):** new data-visibility permission `fields.wages` ("See worker daily wages", on by default for Administrator, Project Manager, Munshi and Accountant; can be switched off per role or per user). Without it worker daily rates disappear from the workers list and detail, Team on Site (and the daily wage bill), hazri, settlement lines, worker types and the daily labour rates, and the rate inputs are hidden and never sent. Paying wages works as before.
- Tests: `tests/unit/components/WorkerWages.test.tsx`, more cases in `tests/unit/components/Equipment.test.tsx` and `PermissionMatrix.test.tsx` (575 → 594). API types (`src/api/generated/schema.ts`) and `tests/unit/catalogFixture.json` regenerated.

### QA re-test fixes (areas A, C)

- **QA-C-02:** Site deliveries opens with either permission, so each section now fetches only with its own key: the received list uses `/dispatches` only with `procurement.dispatch.view` and `/purchases` only with `procurement.purchase.view`; the Owner deliveries tab (and `/owner-deliveries`) needs `inventory.ownerdelivery.view`; the record buttons need the matching create key. An Accountant no longer gets 403s or the permission toast there. The navigation test now lists every "any of" menu item and checks that a view gating its sections calls `useCan` for each key and fetches with `skip`.
- **R1-N1:** quote / estimate warnings stored before params existed (code + message only) show their stored message instead of "{actual}" placeholders or an empty "No price-list rate for: ." list. `translate()` never leaves a raw `{placeholder}` when values are passed (a missing one reads "—"), and `hasAllVars()` tells whether a string can be filled.
- **R1-N2:** the "Use as contract value" dialog says "The new value is Rs 34,53,000 lower / higher than the current one" (amount without a sign) in all three languages.
- **R1-N3:** outside the wizard, the "Contract value from this estimate" card says the value can be changed in Edit project → Contract & Supply instead of "step 2".
- **R1-N5:** New invoice marks a stage that already has a draft invoice "(draft invoice exists)" and disables it.

### QA re-test fixes (area B)
- **Urdu dates read naturally again (R2-B-01):** a date with an Urdu month name is a right-to-left island ("17 فروری 2027", not "فروری 2027 17") on the Gantt, Overview, alerts and everywhere else; only Latin dates and numbers are left-to-right islands.
- **Money and quantities in Urdu (QA-B-04):** every formatted amount is a left-to-right island on Urdu pages ("-Rs 36,470", never "Rs 36,470-"), also inside sentences; quantities read number-then-Urdu-unit with the sign in front.
- **Units in the UI language (QA-A-10 / QA-A-28 / QA-B-24):** quota units on Milestones, the variance page, equipment / loss & damage, rental returns and change-order lines are translated (بوری, عدد, مکعب فٹ, ٹن, کلو, اینٹ …); "bags" / "tons" / "sq ft" spellings are recognised; English says "1 no." / "1 bag"; rates use the singular ("Rs 1,450 / bag").
- **Singular forms in English, Roman Urdu and Urdu (QA-B-24 / QA-A-32 / R1-N4):** "Rain · 1 day", "1 kaam ka din", "1 کام کا دن", "1 room" / "1 کمرہ", "1 approved change order", "1 no. damaged" and more.
- **Milestone names (QA-B-26):** the change-order builder's "Affected milestones", the change-order detail and the variance milestone filter show translated milestone names.
- **Wide tables (QA-B-30):** the P&L and wide report tables (CO register) are dense — small text, tight padding, wrapping headers — and fit 1440 and 1280 px; they still scroll sideways inside the card on smaller screens.
- **Stored UI preferences (R2-B-02):** `cw.ui` = `null` or any other non-object no longer crashes every page.
- **Hydration warning (R2-B-05):** the page hydrates against the state the server rendered with, so a part that hydrates late (login form, pages with search params) no longer meets Urdu text against English server HTML.
- Roman Urdu: "20 qataarein", "der se" instead of "rows" / "late" (R2-B-04). Export downloads keep their name on every storage provider (API change, QA-B-15).
- Tests: `tests/unit/components/QaFixesR2B.test.tsx`.

### QA fixes (area A)
- **One BoQ cost everywhere (QA-A-01 / 02):** the wizard Estimate step and Review show the BoQ total (direct + overheads + contingency) and its margin from the API's new `boqCost`; the old grey-structure cost summary is no longer shown next to it. "Contract value from this estimate" starts from the same total — on the BoQ page from the revision on screen (sent as `estimateId`), and says which revision it uses.
- **No silent replace (QA-A-03):** replacing an existing contract value shows current vs suggested and the difference; lowering it, or replacing the price agreed in a won quote, needs a tick. "Finalize estimate" also offers "Keep current and continue".
- Plot & Structure: an invalid save shows "Not saved — fix the highlighted fields first" and scrolls to / focuses the first invalid field (every form now focuses the first invalid field, including number inputs) (QA-A-06). A framed project from a quote starts with isolated (column) footings (QA-A-21).
- Rooms: opening rows stack into two rows on a phone; the quantity field shows its number (QA-A-07 / 12). Live line: no "-0", units on wall areas, "1 room" (QA-A-32).
- Milestone progress shows at once in the panel and the Gantt after saving (QA-A-08); a bar of work started early is drawn from its actual start (QA-A-18).
- Urdu / Roman: estimate and quote warnings from their code, milestone names from their key, Settings → Rulebook descriptions and units, BoQ / change-order units (singular "/ ton", "/ brick" for rates), invoice type in change-order billing, Urdu month names in dates, the same word for "Active" in the header and the side rail (QA-A-10 / 28 / 29); amounts in the BoQ cost hint keep their order in Urdu (QA-A-30).
- BoQ: a rate typed in on a "No rate" line shows the rate (QA-A-11); on a phone each line shows its amount under the item and a swipe hint (QA-A-26).
- Change orders: "Save draft" creates once, opens the change order and never makes a duplicate (QA-A-13); a change order already waiting for the next stage invoice offers only "Bill separately instead" (QA-A-14). New stage / running-bill invoice: the preview lists and adds the approved change orders that will land on it (QA-A-15).
- Quotes: revision compare shows "+200" / "+1" and signed money changes (QA-A-16); insights count lost quotes without expired ones and label months (QA-A-17); "Mark as won" warns when the plan's project limit is full (QA-A-20); Send / Won dialogs are no longer red (QA-A-31).
- Handover: adding a note or photo no longer ticks the item; one check mark per row (QA-A-19 / 34).
- A page you can't open (not found / no access) says so, without a useless "Try again" (QA-A-25). Schedule pages without a schedule make no 404 requests (QA-A-36).
- Tests: `tests/unit/components/QaAreaA.test.tsx` and additions to the contract-from-estimate, change-order, tax (invoice preview) and closeout tests.

### QA fixes (area B)
- Dashboard alerts, sessions and site dashboard show "2 days ago" again. The relative-time texts were missing in every language, and the hook is now type-checked against the dictionaries.
- Urdu: negative quantities keep their order ("-155.687 cft") and control alert texts use their own direction. Change-order quantities show Urdu / Roman units ("10 بوری"), and 1-count English texts are singular ("1 working day", "Rain · 1 day").
- WHT summary and tax invoice register: column headers, totals and invoice status are translated. Notes and subtitles follow the UI language: every API call now sends `X-Lang`, so server texts such as alerts, delay notes and report notes match the page.
- Overview: "Revised end (all excused days)" on the schedule card and "End date with change orders" on the change-order date. The delay card shows "schedule progress … (by effort)" and control pages show "Value progress", each with a tooltip that explains the basis. The change-order slippage reason is translated, and stoppages with 0 working days are no longer listed.
- Logging a stoppage on an off day warns that it moves nothing, and the list marks it. Alerts show when they were last checked. Saving progress or dates refreshes the control figures and alerts.
- WhatsApp shares use the API's long-lived share link and say how long it works; Preview / Download use the short-lived named file link. Report exports save under their real name (`<report>-<project>-<date>.<ext>`).
- A stored language "roman" (an older build) no longer crashes pages. Roman Urdu no longer mirrors arrows or uses the Urdu line height: RTL styles now follow `dir="rtl"` only.
- Gantt, Milestones, Delay analysis and the move preview show generated milestone names in the UI language. The move preview lists the moved milestone and old → new dates. The Gantt label column is narrower on phones.
- Smaller fixes:
  - P&L hides the projected margin when the API leaves it out.
  - Compact money puts the minus first ("-Rs 5.78 L"), and report money is whole rupees.
  - Wide tables (P&L, report books) are denser.
  - Card action rows wrap on phones.
  - "Used %" header.
  - Roman project status "Chalu" everywhere.
  - "Make change order" is not styled as dangerous.
  - The tax settings page shows no extra 403 toast for users without access.
- API types regenerated.

### QA fixes (area C)
- **No more permission toasts on project pages for the Accountant (QA-C-01)**: the project shell loads the "Incoming Material" count only when that menu item is visible (`procurement.dispatch.view`); the same for the Purchases location filter (`inventory.stock.view`, QA-C-03) and Settings → Company / Alerts / Tax behind their gate.
- **Page gates on the Phase 1 site, labour and cash pages (QA-C-02)**: Daily Logs, Incoming (and receiving), Deliveries (and site purchase), Usage, Stock, Counts, Team, Hazri, Measurements, Peshgi, Settlements (and detail), Kharcha, Floats, Top-ups and Cash Counts show "Not available for you" by URL, with the same rule as their menu item (the navigation test now checks them; only All / Closed projects stay ungated).
- **Rentals**: the return form asks for the yard's **Missing pieces charge** when pieces are missing (empty = replacement value, QA-C-08); the rental and its returns show the missing-pieces charge, and each return line shows its damaged and missing pieces ("17 nos … (2 nos damaged, 3 nos missing)", QA-C-07). Days / rent to date follow the API's single rent-day rule (QA-C-04).
- **Equipment on Site (QA-C-05)**: the KPI tiles are "Hire posted" / "Rent posted" (charges posted so far), so they no longer share the "Rent to date" label with the live per-rental figure.
- **Owned Equipment (QA-C-06)**: "On rent" sits next to "Owned", and the location columns say "At sites (own + rented)" / "Yard (own + rented)", so Owned + On rent = At sites + Yard + In transit.
- **Closeout pages (QA-C-09)**: no "records are read-only" banner on Handover (ACTIVE / CLOSEOUT), Retention (CLOSEOUT / HANDED_OVER), Drawings and Snags (until handed over) while their forms still work (`ProjectPageShell editableStatuses`).
- **Urdu**: date ranges read start → end ("{from} سے {to} تک" in Shuttering Demand, dashboard and holidays; the date-range picker keeps the range as one left-to-right unit, QA-C-12); user notes and descriptions on equipment and closeout screens use `dir="auto"` ("3 sets — …" stays as typed, QA-C-13); a sub-contractor is "ذیلی ٹھیکیدار" / "Sub-contractor" everywhere (equipment, labour, workforce, cash, reports), never the owner's word "ٹھیکیدار" / "Theke daar" (QA-C-14).
- **Team (QA-C-15)**: Members and Invitations show the permission role ("Accountant") first and label the PM / Munshi badge "Account type".
- **Signup / invite (QA-C-16)**: the trial note says "2 active projects"; the invite page names the company and the role ("Malik & Sons Builders invited you to join them as Accountant") and shows a dead link at once.
- **Drawings (QA-C-23)**: only the latest revision offers "Mark approved today".
- Smaller: lighter placeholders and "e.g." examples on the Add equipment form (QA-C-24); the Shuttering Demand "Needed" line uses straight segments (QA-C-25); "1 loss recorded" / "2 losses recorded" (QA-C-26); the snag detail says "Assigned to" (QA-C-27); Admin → Company → Timeline shows who did it by name (QA-C-28); the dashboard greets "Welcome, {name}." (QA-C-29).
- API types regenerated (`GET /invitations/{token}`, `missingChargesPaisa`, drawing `REVISION_SUPERSEDED`).

### Step 18 — Performance and polish
- Every Phase 2 / 3 page now checks its permission itself (estimate, revisions, shopping list, rulebook, change orders + detail / edit / site instructions, drawings, snags, handover, retention), with the same key as its menu item; a new test walks the whole menu and checks every link opens a real page with a matching gate.
- Helpful empty states: no change orders → "New change order", no quotes → "New quote", no equipment → "Add equipment", no rentals → "New rental" (each only with the create permission); control pages without a schedule or an approved estimate link to the Gantt / the estimate.
- The setup checklist shows optional next steps (review rulebook values, first quote, equipment, tax settings) for users who may open them; they hide with the checklist.
- Removed a stale "was Coming soon" note; only Admin → Communication and Security stay "Coming soon". API types regenerated (P&L docs text).

### Step 18 — Reports
- **Reports → Delay Analysis** is live (no longer "Coming soon"), with **Variance Report**, **Change Order Register**, **Equipment Utilisation** and **Snag Summary** next to it: filters (project, dates; change-order status / type; equipment category and per item / per category), charts (delay days by cause, progress vs plan, change orders by status, utilisation, snags by status), KPIs, a translated table and CSV / Excel / PDF export with the same filters.
- Picking a project on Delay Analysis, Variance or Snag Summary opens that project's full report (stoppages, change-order days, late milestones / material variance, cost buckets, burn by month / snags by assignee, open list, defect period) with its own CSV / Excel / PDF export.
- Each page needs Reports access plus the module's view permission (control, change orders, equipment, snags); the Munshi never sees them. Rupee columns appear only with the matching data-visibility permission, with a note when they are hidden.
- Everything in English, Roman Urdu and Urdu (new area `src/i18n/areas/reports/`), including column headers and statuses the API sends in English.

### Step 18 — Tax
- **Settings → Tax** is live (was "Coming soon"): switch sales tax on / off (off by default), authority (PRA, SRB, KPRA, ICT) with a "use the usual rate" shortcut, rate, name on invoices, company NTN and STRN, the usual client WHT rate, how tax is worked out with a worked example, and a "check with your tax adviser" note. The Accountant can read it; only the owner / Administrator can change it. The tax fields left Settings → Alerts & Limits (a link points to the new page).
- **Billing → Invoices** shows the tax new invoices of the project get ("PRA Sales Tax 16% on new invoices · From the company tax settings") with **Change** (project override: same as company / always / no tax, authority and rate for a project in another province).
- **New invoice** previews the tax line and the total when tax applies; **invoice detail** shows the taxable value (when it differs), the tax line, whether the tax is still following the settings (draft) or frozen, and our NTN / STRN + the client's NTN.
- **Record payment**: WHT amount or WHT rate (the other is worked out, "Use 8%" fills the usual rate), certificate number, date and file — only when tax is on for the project. **Payments** list gets a WHT column with "Certificate missing" and a **WHT certificate** row action to add it later.
- **Reports → WHT Summary** and **Tax-wise Invoice Register** (filters: project, dates — default this tax year Jul – Jun; CSV / Excel / PDF), for `tax.view` + money amounts.
- Clients have an optional **NTN / CNIC**.

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

### Step 14
- **Project → Control** pages are live (no more "Coming soon"), each needs `control.view`: **Material Variance** (per material: estimate to date vs delivered / used / counted loss / in stock, variance qty and %, status, rupee impact split into quantity and price — rupees only with `fields.rates`; milestone filter), **Cost Variance** (buckets vs the estimate to date with a bar chart, labour + sub-contract together, progress by stage, projected margin at completion card), **Burn Rate vs Progress** (spent % of contract vs progress % per month, gap bars red where spending runs ahead), **Delay Analysis** (the Step 13 delay cards + every milestone planned vs actual, behind / late, and a timeline of stoppages, plan versions and site updates). Each page lists the project's open control alerts with **Check now** (`control.manage`).
- **P&L**: "Projected margin" now shows the real figure (company KPI hint, per-project column, project P&L card with how it is worked out) — no more "Available after estimates (Phase 2)".
- **Dashboard**: control alerts (material overuse, behind plan, quota used up, spend ahead, idle rentals) in the alerts list with the rule name; "N delayed" under Active projects; project rows show physical progress and the projected margin (with the permissions).
- **Settings → Alerts & Limits**: new thresholds — behind-plan points, late-finish grace days, quota %, spend-ahead points — and a switch for control alerts.
- Permission keys `control.view`, `control.manage` (PM and Accountant templates get `control.view`); API types and the catalogue fixture regenerated from the Step 14 API; texts in `src/i18n/areas/control/` (en · roman-ur · ur).
- **Dashboard → Alerts**: the type filter also lists Control alert, Daily log missing, Retention release due and Site instruction recorded (with Equipment idle), labelled in English, Roman Urdu and Urdu; the web `NotificationType` union matches the API enum.

### Step 13
- **Project → Schedule** pages are live (no more "Coming soon"): **Gantt**, **Milestones & Quotas**, **Stoppage Days** and the new **Plan Versions** — each needs `schedule.plan.view`.
- **Gantt** (weeks view): stage rows and milestone bars with progress fill, baseline ghost bars, curing bands, stoppage bands (approved solid, pending hatched), off days / holidays shaded, Ramadan strip, today line, FS / SS dependency arrows and late markers; the timeline always runs left to right (also in Urdu), labels follow the page direction. **Generate schedule** from the approved estimate (or "Approve an estimate first" with a link to the estimate), **Re-plan** (baseline never changes).
- **Drag a bar** of work not started to move its start: a dry run shows which milestones move and the new planned end before **Save new dates**; the milestone panel's "Start no earlier than" field does the same from the keyboard (`schedule.plan.manage`).
- **Milestone panel**: dates vs baseline, curing, dependencies, payment stage, material quota, progress history and **Update progress** (progress %, status, date, note — Blocked needs a note; stage-lock and predecessor warnings as toasts) with `schedule.progress.edit`.
- **Milestones & Quotas**: per material planned vs used vs remaining (project totals and per milestone, stage filter, usage not linked to a milestone). No money.
- **Stoppage Days**: KPIs, status filter, log a stoppage (range or separate days, reason, site photo required except for a holiday, note required for "Other"), approve with the responsible party (Owner / Excusable / Contractor) or reject with a reason (`schedule.stoppage.approve`).
- **Project Overview → Schedule & delays**: original, revised and projected end, slippage by cause with reasons, pending stoppage days.
- **Settings → Alerts & Limits → Ramadan working days**: day factor (0.25–1) and Ramadan dates (built-in or the company's own).
- All texts in English, Roman Urdu and Urdu (`src/i18n/areas/schedule/`); schedule error messages; status domains `milestone`, `scheduleStage`, `stoppage`.

### Step 15
- **Project → Change Orders** (replaces "Coming soon"): list with KPIs (approved changes, revised contract, revised end date, waiting for the owner), status filter, CHANGE_ORDER snags with "Make change order"; **New / Edit** builder (mini BoQ: materials at the estimate / price-list rate, labour rates, other items, markup %, live cost / markup / owner totals, days impact, affected milestones, proof); **detail** with a status stepper (send → approve / reject → work started → completed → billed), approval dialog with proof (WhatsApp screenshot / signed slip file / verbal note), "Bill it" (next stage invoice or variation invoice), slip PDF preview / download / WhatsApp.
- **Site instructions** page (`/projects/:id/change-orders/instructions`): record an instruction (note + photo), convert to a change order draft or dismiss; the Munshi sees own ones.
- Project overview: Contract card shows the revised contract, Client & site card the revised end date when change orders are approved.
- Permission keys `changeorder.*`, nav items gated (Munshi: Site instructions only); money hidden without `fields.rates` / `fields.amounts` / `fields.contract`. API types + catalogue fixture regenerated. Texts in `src/i18n/areas/changeOrders/` (en / roman-ur / ur).
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
