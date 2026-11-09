# Zimele Technologies Learning Platform: frontend demo

**Branding.** The demo carries the Zimele Technologies identity: the logo (`src/assets/zimele-logo.png`, taken from zimeletechnologies.com), green palette sampled from that site and logo (primary `#597f2d`, brand green `#75b040`, light `#92ca61`, dark `#2c3d1d`) and Century Gothic. The Fluent brand ramp is in `src/App.tsx`; accents live in each area's CSS. Company name, address and phone come from the public website. Registration and VAT numbers, bank details and all people and client names are still invented.

A clickable, frontend-only demo of the training platform: TMS (opportunity to invoice), LMS (courses, progress, skills), the B2C purchase flow and the talent connection, with the access rules visibly working. No backend, no login, invented data. React + TypeScript + Vite, Fluent UI v9, React Router, Zustand, Recharts.

## Run it

Easiest on this machine (portable Node, no PATH changes): double-click **`start-demo.bat`** (opens http://localhost:5173). `build-demo.bat` builds the static site into `dist/`.

Or from a terminal in this folder:

```powershell
$env:PATH = "$PWD\node-v26.13.0-win-x64;$env:PATH"
npm install        # already done once
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (works from any web host)
npm test           # unit, ringfencing and render-every-screen tests
```

## Presenting it

- **Guided tours** (play button in the top bar, and a welcome dialog on first visit): five scripted stories that switch persona and screen for you, with a caption per step: Opportunity to invoice, A self-paying learner, Talent connection and ringfencing, An instructor's day, How access works.
- **Ctrl + K** opens a command palette: jump to any screen, switch persona, toggle dark mode or the explainer, reset. Press **?** for shortcuts.
- **Viewing as** switches between the eight personas and **All access**; navigation follows the role. The bell shows role-specific notifications (overdue invoices, deadlines, pending introductions, clashes...).
- **Demo map** lists every screen with its roles and release badge, with search, filters and an "Open as..." shortcut.
- **Access explainer** shows on each screen why that role sees what it sees. Opening a screen your persona cannot use switches to one who can, with a notice.
- **Reset demo** restores all seed data (including every area's own store). Everything else you do persists in the browser's localStorage.

| Persona | Name | Home |
|---|---|---|
| Administrator | Thandi Mokoena | Dashboard (KPIs, alert centre, forecast, agenda) |
| Finance | Pieter van Wyk | Finance dashboard (cash, ageing, collections) |
| Instructor | Naledi Dlamini | My schedule (next class, checklist, load) |
| Internal learner | Sipho Khumalo | My learning (streak, goals, recommendations) |
| B2B client contact | Ayesha Patel (Cape Freight) | Client dashboard (spend vs budget, compliance) |
| B2B learner | Johan Botha (Cape Freight) | My learning, employer-paid |
| B2C learner | Zanele Ndlovu | My learning, bookings and talent profile |
| Recruiter | Marcus Lee (Atlas Recruitment) | Recruiter dashboard (funnel, shortlist, saved searches) |

## What is in it

- **TMS**: dashboard; opportunities board/table with drag-and-drop, win/loss reasons, tasks and quote creation; quote builder with live VAT totals, bundles, versions and a printable document; guided needs analysis with a skills-gap heatmap; courses with detail pages, curriculum editor and clash-aware scheduling; month/week/agenda calendar with drag to reschedule; resources with a clash resolver; class lists with attendance, results, certificates, waitlist and printable sheets; invoicing with detail drawer, credit notes and printable invoices; Workbook sync with payloads, mapping and bulk resend; reports with tabs, comparisons and CSV export; communications with templates and campaigns.
- **B2B client portal**: dashboard, bookings with a request wizard (booking and quote requests land in staff Opportunities as "Client portal" enquiries with a follow-up task, and the client sees the staff stage: moving it to Won shows Confirmed), learners with bulk CSV paste, compliance matrix (staff x mandatory certificates), statements and invoices.
- **B2C and LMS**: faceted catalogue with compare, wishlist and reviews; four-step checkout with coupons (WELCOME10, DEMO15, STUDENT5); bookings calendar and receipts; academies, mentoring, certifications (R2); a full course player (outline, slides, video mock, notes, timed quiz, printable certificate); skills radar, journeys, achievements, learning admin with compliance matrix.
- **Talent (R3)**: opt-in with granular visibility, recruiter search with match scoring against job briefs, compare and shortlist, introduction threads, consent history, recruiter approvals, audit log, ringfencing check and ROI report.
- **Administration**: organisations and people directory with 360 view, audit trail, settings, access rules with a role simulator, Demo map.

## Code layout

`src/shared` (types, seed, store, access model, shell, presenter tools), `src/tms` (incl. `money/`, `ops/`, `client/` and the B2B portal), `src/b2c`, `src/lms`, `src/talent` (incl. `ringfence.ts` and its test), `src/admin`. The screen/role registry in `src/shared/access.ts` plus each area's `extra.screens.ts` drives navigation, route guards, the Demo map and the Access rules. Each area has its own small persisted store (registered with Reset demo) for its extra data.

## Choices where the brief was silent

- Hash URLs (`#/dashboard`) so the built folder works on any static host.
- Seed dates are relative to the first time the app is opened in a browser, then stored. Reset demo re-anchors them to today.
- **Ringfencing** is a whitelist: only `payer === 'self'` enrolments can feed a recruiter-visible profile; internal-staff enrolments are excluded too, so the Talent admin "excluded learners" count is 22 (14 B2B + 8 internal). Lindiwe Mahlangu is the mixed-history learner (two self-paid courses visible, one employer-paid hidden). Zanele starts opted out so opting in visibly adds her.
- **All access** borrows identities so screens have data (Zanele for learner screens, Marcus for recruiter screens, Ayesha/Cape Freight for the client portal, Naledi for instructor screens).
- Longer-range charts (12-month revenue trends, ROI history) combine your real seed invoices with invented history, because the seed only spans about four months. Delivery stats on campaigns, reviews, leaderboard colleagues and streak history are invented and deterministic.
- Extra per-area data (opportunity tasks, quote versions, notes, message threads, booking requests and so on) lives in each area's own store rather than in the shared data types.
- Prices show ex VAT in the catalogue and quotes; checkout and receipts add 15% VAT. Costs in profitability reports are illustrative.
- Mocked: payment (always succeeds after a short delay), emails (preview only), SCORM and video (generated mock content), AI summary (canned text), single sign-on and online quote acceptance (R2 notes only), printing (uses the browser's print dialog).

## Verification

`npm run build` and `npm test` pass (unit tests per area, the ringfencing rule, and an SSR render of every screen for every persona). The built app was also driven in a real browser (Microsoft Edge, headless) to check that every screen opens without runtime errors for every persona, the access guard, the Workbook resend, quote totals, checkout, the opt-in/introduction/audit/ringfencing flow, the explainer and Reset demo.
