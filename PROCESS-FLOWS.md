# Zimele Technologies Learning Platform: Process Flows and Workflows

This document maps every business process the demo implements. It was derived from the code (stores, logic modules and screens), not from the README, so rules and numbers here are the ones the app actually enforces. Where the demo mocks or omits something, that is called out.

Diagrams are plain-text box diagrams in code blocks, so they look the same in any viewer or editor (use a monospaced font).

## Contents

1. [Actors and access model](#1-actors-and-access-model)
2. [End-to-end value chain](#2-end-to-end-value-chain)
3. [TMS: sales and delivery (staff)](#3-tms-sales-and-delivery-staff)
4. [TMS: money](#4-tms-money)
5. [B2B client portal](#5-b2b-client-portal)
6. [B2C: catalogue, checkout and bookings](#6-b2c-catalogue-checkout-and-bookings)
7. [LMS: learning and compliance](#7-lms-learning-and-compliance)
8. [Talent connection](#8-talent-connection)
9. [Administration](#9-administration)
10. [Cross-cutting rules](#10-cross-cutting-rules)
11. [Gaps fixed and remaining limitations](#11-gaps-fixed-and-remaining-limitations)
12. [Business rules quick reference](#12-business-rules-quick-reference)

---

## 1. Actors and access model

Eight personas plus a presenter-only "All access". Navigation, route guards, the Demo map and the Access rules screen are all generated from one registry (`src/shared/access.ts` plus each area's `extra.screens.ts`).

| Persona | Name | Type | Home | Main responsibilities |
|---|---|---|---|---|
| Administrator | Thandi Mokoena | Staff | Dashboard | Pipeline, quotes, needs analysis, courses and sessions, scheduling, communications, learning assignment, user admin, recruiter approval |
| Finance | Pieter van Wyk | Staff | Finance dashboard | Invoicing, payments, credit notes, Workbook sync, reports |
| Instructor | Naledi Dlamini | Staff | My schedule | Run sessions: attendance, results, certificates; see resource calendar |
| Internal learner | Sipho Khumalo | Learner | My learning | Takes courses assigned by the company (payer `internal`) |
| B2B client contact | Ayesha Patel (Cape Freight) | External | Client dashboard | Request bookings and quotes, accept quotes, manage own staff, view invoices and compliance |
| B2B learner | Johan Botha (Cape Freight) | Learner | My learning | Takes employer-paid courses (payer `employer`) |
| B2C learner | Zanele Ndlovu | Learner | My learning | Buys courses online (payer `self`), optional talent profile |
| Recruiter | Marcus Lee (Atlas Recruitment) | External | Recruiter dashboard | Searches anonymised candidates, requests introductions |

The payer on an enrolment (`self`, `employer`, `internal`) is the single most important data attribute. It decides who sees a learner's history, whether a learner can ever appear to recruiters, and which invoice a course falls under.

```text
 STAFF                                   CUSTOMERS
 ┌────────────────┐                      ┌────────────────────┐
 │ Administrator  │── quotes, assigns ──▶│ B2B client contact │
 │                │◀─ requests, accepts ─│                    │
 └───────┬────────┘                      └─────────┬──────────┘
         │ hands over for invoicing                │ manages
         ▼                                         ▼
 ┌────────────────┐                      ┌────────────────────┐
 │ Finance        │── invoices, ────────▶│ B2B learner        │
 │                │   reminders          │ (employer-paid)    │
 └────────────────┘                      └────────────────────┘
 ┌────────────────┐                      ┌────────────────────┐
 │ Instructor     │── attendance, ──────▶│ Internal learner   │
 │                │   results, certs     │ (company-paid)     │
 └────────────────┘                      └────────────────────┘
         ▲                               ┌────────────────────┐
         │ scheduled by Administrator    │ B2C learner        │
         │                               │ (self-paying)      │
                                         └─────────┬──────────┘
 EXTERNAL                                          │ opts in, approves intros
 ┌────────────────┐                                ▼
 │ Recruiter      │◀── approved by Administrator, sees anonymised profiles
 └────────────────┘
```

When a persona opens a screen it cannot use, the app switches to a persona who can and shows a notice (a demo convenience; the real product would hide the screen).

---

## 2. End-to-end value chain

The platform covers four commercial routes that converge on one delivery and certification engine.

```text
  DEMAND
  ┌───────────────────────┐  ┌───────────────────┐  ┌──────────────────┐
  │ Enquiry / referral /  │  │ Client portal     │  │ Needs analysis   │
  │ tender                │  │ request           │  │ (TNA)            │
  └───────────┬───────────┘  └─────────┬─────────┘  └────────┬─────────┘
              └────────────────────────┼─────────────────────┘
                                       ▼
                          ┌──────────────────────────┐
                          │ Opportunity: Enquiry     │
                          └────────────┬─────────────┘
                                       ▼
                          ┌──────────────────────────┐
                          │ Quote (Draft → Sent)     │
                          └────────────┬─────────────┘
                                 accepted
                                       ▼
                          ┌──────────────────────────┐
                          │ Opportunity: Won         │
                          └──────┬────────────┬──────┘
                invoice raised   │            │  2 follow-up tasks
                automatically    ▼            ▼
                      ┌──────────────┐   ┌─────────────────────────┐
                      │ Invoice      │   │ Enrolments and sessions │◀─ Internal
                      └──────┬───────┘   └────────────┬────────────┘   assignment
                             ▼                        ▲
              ┌────────────────────────────┐          │ checkout + receipt
              │ Payment, credit notes,     │   ┌──────┴────────────┐
              │ Workbook sync              │   │ B2C catalogue     │
              └────────────────────────────┘   │ purchase          │
                                               └───────────────────┘
  ENROLMENTS CONTINUE INTO DELIVERY
                    ┌─────────────────────────────────────────┐
                    │ Classroom session  or  self-paced player │
                    └────────────────────┬────────────────────┘
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │ Attendance → result → certificate       │
                    └───────┬─────────────────┬───────────────┘
                            ▼                 ▼
              Compliance matrix,        Talent profile
              skills, journeys          (self-paid only)
```

Accepting a quote now raises the invoice and gives the opportunity owner two delivery tasks (see [3.3](#33-quote-lifecycle) and [Gaps](#11-gaps-fixed-and-remaining-limitations)). Enrolling learners and scheduling sessions is still a staff action, prompted by those tasks.

Every enrolment is bracketed by two surveys: a **pre-course** survey before delivery and a **post-course** survey after completion (see [7.5](#75-pre--and-post-course-surveys-microsoft-forms)). They feed the confidence-uplift and satisfaction figures in Learning admin.

---

## 3. TMS: sales and delivery (staff)

### 3.1 Opportunity pipeline

Stages and default win probability: **Enquiry 10% -> Needs analysis 30% -> Quoted 60% -> Won 100%**, with **Lost 0%** as the exit.

```text
   create (manual / client portal / TNA)
            │
            ▼
      ┌───────────┐  scope  ┌────────────────┐  send quote  ┌────────┐
      │  ENQUIRY  │────────▶│ NEEDS ANALYSIS │─────────────▶│ QUOTED │
      │   10%     │         │      30%       │              │  60%   │
      └─────┬─────┘         └───────┬────────┘              └───┬────┘
            │ send quote ─────────────────────────────────────▶│
            │                       │                          │
            │                       │                  quote accepted
            │                       │                  or manual (reason)
            │                       │                          ▼
            │                       │                      ┌───────┐
            │                       │                      │  WON  │ 100%
            │                       │                      └───────┘
            ▼                       ▼                          │
      ┌──────────────────────────────────────────────┐         │
      │ LOST  0%   (manual, reason required)         │◀────────┘ (from Quoted)
      └──────────────────────────────────────────────┘
```

| Step | Who | What happens | Rules |
|---|---|---|---|
| Create opportunity | Admin | New opportunity dialog | Client required; title at least 3 characters; value above R0; expected close required. Starting stage can be Enquiry, Needs or Quoted only. Owner is an admin staff member. Source: Inbound enquiry, Referral, Existing client, Tender, Website enquiry, Event (or "Client portal" when auto-created). Logs "Opportunity created" and an event on the opportunity timeline. |
| Move stage | Admin | Drag card on board, or change from drawer/table | Moving to **Won** or **Lost** forces a **reason dialog**. Win reasons: Price, Facilitator quality, Existing relationship, On-site delivery, Speed of response, Other. Loss reasons: Price too high, Went in-house, Chose a competitor, Budget cut or postponed, No response, Other. "Other" requires a short explanation. Each move resets `stageSince`, appends a timeline event and writes to the activity feed. |
| Age tracking | System | Days in stage | Over 14 days = warning, over 30 = bad. |
| Tasks and notes | Admin | Per-opportunity tasks with due dates | Client-portal leads get an auto task "Respond to {org}'s {booking/quote} request" due the next day. |
| Forecast | System | Weighted value = value x stage probability | Value bands: under R100k, R100k-R250k, R250k and above. Dashboard/Reports show funnel conversion per stage. |

### 3.2 Training needs analysis (TNA)

A five-step wizard that turns client skills gaps into a recommended programme.

```text
  ┌──────────┐   ┌──────────────────────┐   ┌─────────────────────────┐
  │ 1 Client │──▶│ 2 Context            │──▶│ 3 Needs by department   │
  │          │   │ drivers, goal,       │   │ headcount + gap (0-4)   │
  └──────────┘   │ budget, timeframe,   │   │ per skill area          │
                 │ headcount            │   └────────────┬────────────┘
                 └──────────────────────┘                ▼
                              ┌──────────────────────┐  ┌────────────────────┐
                              │ 5 Summary            │◀─│ 4 Course mapping   │
                              └──────────┬───────────┘  │ pick courses/seats │
                                         │              └────────────────────┘
        ┌────────────────┬───────────────┼─────────────────┬──────────────────┐
        ▼                ▼               ▼                 ▼
  Save analysis     Export CSV   Convert to opportunity   Convert to quote
                                                          (lines pre-filled)
```

Recommendation engine (`recommend()` in `tms/ops/logic.ts`):

- Skill areas: Health & Safety, Leadership, Project Management, Finance Skills, Cybersecurity, Compliance, Soft Skills.
- For each area, departments with a gap of 1 or more are "hit". Headcount-weighted average gap decides priority: **High at 3 or above, Medium at 2 or above, otherwise Low**.
- Seats recommended = headcount of departments with a gap of 2 or more (or half the affected headcount if none reach 2).
- Up to two Active courses per area are proposed (the second is flagged as an alternative). Output is sorted primary-first, then by score.
- Summary warns "over budget" when the recommended investment exceeds the stated budget, advising to reduce seats or phase it before quoting.

### 3.3 Quote lifecycle

```text
  new quote (blank, from opportunity, from TNA, bundle, or duplicate)
        │
        ▼
   ┌─────────┐  Send to client   ┌────────┐◀──┐ Resend / Reissue
   │  DRAFT  │──────────────────▶│  SENT  │───┘
   └─────────┘                   └───┬─┬──┘
                                     │ │
        client e-accepts             │ │  validity passes /
        or admin "Mark accepted"     │ │  "Mark as expired"
                  ┌──────────────────┘ └───────────────┐
                  ▼                                    ▼
           ┌────────────┐                       ┌────────────┐
           │  ACCEPTED  │                       │  EXPIRED   │
           │  (locked)  │                       └─────┬──────┘
           └────────────┘                             │ Reissue for 30 days
                                                      └────────▶ back to SENT
  Accepted: invoice raised, opportunity → Won, 2 delivery tasks added.
  To revise an accepted quote, duplicate it.
```

| Step | Who | Rules and side effects |
|---|---|---|
| Build | Admin | Lines (course, qty, list price, per-line discount 0-100), quote-level discount 0-100, venue, instructor, validity (default 30 days), terms (10+ characters). Whole-number quantity of at least 1. Bundles available: Safety starter, New supervisor pack, Digital trust bundle, Finance for managers. Quote numbers are `Q-2026-NNN`, incrementing from the highest existing number. |
| Totals | System | Subtotal, minus discount, equals net; VAT 15% on net; total. Updates live. |
| Send | Admin | Status -> Sent, records `sentAt`. If linked to an opportunity still in Enquiry or Needs, **auto-moves it to Quoted**. Shows an email preview that points the client to the portal. |
| Accept (client) | Client contact | Sees only own organisation's quotes, **never drafts**. Must tick "I am authorised to accept this quote" and type a name (e-signature). Not offered once past its validity date. |
| Accept (admin) | Admin | "Mark as accepted" without signature. |
| On acceptance | System | Status -> Accepted, stores signer and timestamp, logs the e-signature, and **auto-moves the linked opportunity to Won** with reason "Quote accepted by client". The quote is then locked. It then runs the hand-off below. |
| Hand-off to finance | System | **Raises an invoice** (`INV-nnnn`, next number): organisation from the quote, amount = quote net ex VAT, status Sent, issued today, due in 30 days, Workbook status Pending (queued attempt logged). The invoice number is stored on the quote so it is raised **once only**, however many times acceptance runs. An Accepted quote with no invoice (older data) shows a **Raise invoice** button; once raised it shows "Invoiced as INV-nnnn". |
| Hand-off to delivery | System | Adds two tasks to the linked opportunity: "Schedule sessions for quote Q-..." (due in 3 days) and "Enrol learners and confirm dates with the client" (due in 7 days). Not duplicated on repeat. Sessions and enrolments themselves remain a staff action. |
| Expiry | System | Days left shown; 7 days or fewer = warning; negative = "Expired N days ago". Dashboard counts "expiring within 7 days". |
| Extend | Admin | "Reissue for 30 days" resets validity to today + 30 and status to Sent. |
| Duplicate | Admin | New Draft, new number, copies lines, terms and per-line pricing, internal note "Duplicated from ...". |

### 3.4 Course and session setup

| Process | Who | Rules |
|---|---|---|
| Maintain courses | Admin | Course has code, category, soft/technical flag, price (ex VAT), hours, status Active / Draft / Retired, skills, curriculum. Only Active courses can be requested by clients, bulk-added, or recommended. |
| Schedule a session | Admin | Course (not Retired), date, venue, instructor, capacity, equipment, status Scheduled / Completed / Cancelled. Capacity must be a whole number of at least 1 and **cannot drop below seats already booked**. |
| Conflict detection | System | Another non-cancelled session **on the same date** conflicts if: same venue (online excluded), same instructor, together need more units of a **stock-tracked** equipment item than are held (see Venues and equipment below; by default the Laptop trolley is 1 unit, one per session, and Loan laptops are 16, one per learner), the instructor marked that date unavailable, or the venue or an equipment item is **out of service**. Default equipment: Projector, Laptop trolley, First aid manikins, Harness kit, Loan laptops. |
| Resolve clashes | Admin | Suggestion engine offers alternative free venues, free instructors, and up to 5 free **weekdays** within 21 days either side (never in the past), plus "Release laptop trolley". One click applies the fix and logs it. |
| Calendar | Admin / Instructor | Month, week, agenda views; drag to reschedule. Clashes highlighted red. Resource occupancy = share of working days with a session. |
| Venues and equipment | Admin | **Resources -> Manage resources** is the register of bookable venues (name, city, seats, status, notes) and equipment (name, sharing, status, notes); instructors stay under Facilitators. Names need 3 or more characters and must be unique (ignoring case); venue seats are a whole number of at least 1. A venue name starting with "Online" never clashes. Equipment has **units in stock** (a batch, such as 16 laptops; 0 means not tracked and never clashes). A session says how many units it needs; if it does not, a **per-learner** item (such as laptops, the default for new items) needs one unit per learner booked, and any other item needs one unit. A day clashes when the sessions using the item together need more than the stock. **Add a batch** pastes many items at once as `name, quantity, per learner` lines (the last column is yes or no, default yes); valid lines are added, and names already in the register are rejected. Stock cannot be reduced below the most that upcoming sessions already need on one day. **Out of service** items cannot be picked for new sessions and raise a conflict on sessions that already use them. **Renaming** updates every session (including its unit counts) and the venue on quotes that used the old name. **Delete is blocked** while upcoming sessions, or open Draft/Sent quotes for a venue, use it; past sessions keep the name. Every add, edit and removal writes an activity-feed entry. Session capacity above a venue's seats shows a note. |
| Facilitators | Admin | Add, edit, delete instructors. Deleting one with upcoming sessions or quotes **requires choosing a replacement**, then reassigns upcoming sessions and their quotes. The Instructor persona's facilitator cannot be deleted. |

### 3.5 Running a class (attendance to certificate)

```text
  Session scheduled with capacity
              │
              ▼
  Learners enrolled  (checkout / assignment / client booking / waitlist)
              │
              ▼
        Session full? ──yes──▶ Waitlist (admin adds learner)
              │ no                      │ seat frees up
              │                         ▼
              │              Promote → enrolment (payer from learner type)
              ▼                         │
        ┌──────────────────────────────┘
        ▼
  Delivery day
        │
        ▼
  Instructor ticks attendance (or "Mark all present")
        │
        ▼
  Instructor enters result 0-100
        │
        ▼
  Attended AND result ≥ 50 ? ──no──▶ No certificate
        │ yes
        ▼
  Issue certificate (single or bulk)
        ├──▶ congratulations email → sent log
        ├──▶ activity feed entry
        └──▶ enrolment → Completed, progress 100
```

- Class-list pass mark is **50%**; the button tooltip states "attendance and a pass mark of 50% or more".
- The class list shows pass rate and average result of marked learners; attendance sheet and CSV export are available.
- Certificate IDs look like `CERT-1xxx`. **Validity by category: Health & Safety and Compliance 730 days, Cybersecurity 365 days; other categories never expire.** This is one table (`CERT_VALIDITY_DAYS`) and matches the client compliance matrix.
- Issuing a certificate is idempotent: an enrolment that already has one is skipped.
- Promotion from waitlist is blocked if the learner already has an enrolment on that session.
- The class list shows **Pre survey** and **Post survey** columns per learner (tick or "To do") and the CSV export includes them. **Remind pre-course survey (n)** emails the learners who have not answered. Issuing certificates (single or bulk) also emails each learner the post-course survey invite. See [7.5](#75-pre--and-post-course-surveys-microsoft-forms).

### 3.6 Communications

- Message templates (`m1` booking confirmed, `m2` course reminder, `m3` joining instructions, `m4` certificate, plus custom ones such as the payment reminder). Merge fields: `name`, `course`, `date`, `org`, `invoice`, `amount`, `venue`; unknown fields are flagged.
- Audiences: all learners on a course, a client's learners, or clients with overdue invoices (de-duplicated by email).
- Campaigns can be Sent or Scheduled. Delivery stats (open/click/bounce) are deterministic fakes.
- Many processes write to the **sent log** automatically (booking confirmation, certificate, assignment, payment reminder, nudges). No email actually leaves the browser.

---

## 4. TMS: money

### 4.1 Invoice states

```text
  raised when a quote is accepted (or seed data)
        │
        ▼
   ┌────────┐  due date passes   ┌───────────┐
   │  SENT  │───────────────────▶│  OVERDUE  │
   └───┬────┘                    └─────┬─────┘
       │ Mark paid                     │ Mark paid
       ▼                               ▼
   ┌─────────────────────────────────────────┐
   │                  PAID                   │
   └─────────────────────────────────────────┘
```

Invoice total = amount x 1.15 (VAT) minus any credit note. Balance is zero when Paid.

### 4.2 Collections

```text
  Invoice past due
        │
        ▼
  Alert Centre: "N overdue invoices" (amount, oldest N days)
        │
        ▼
  Finance dashboard: ageing buckets and debtors
        │
        ▼
  Select invoices
        ├──▶ Send reminder → email to client contact
        │         └──▶ sent log + activity feed + invoice timeline
        └──▶ Mark paid
                  └──▶ status Paid, paidOn = today, payment queued for Workbook
```

- Ageing buckets (finance): **Current, 1-30, 31-60, 61+** days past due. Client statement buckets: Not yet due, 1-30, 31-60, 61-90, Over 90.
- DSO = receivables / invoiced in trailing 90 days x 90.
- Reminder recipient: the organisation's first contact, or the individual B2C learner. Subject "Payment reminder: invoice INV-xxxx".
- Marking paid is bulk-capable and skips invoices that are already Paid.
- An invoice paid through PayGate or SnapScan is marked Paid automatically when the notification arrives, matched by invoice number (see [6.5](#65-paying-through-paygate-and-snapscan-production-design)); Mark paid is then needed mainly for bank transfers. The Invoicing screen lists these payments, with an **unmatched queue** that Finance allocates by hand, and **Simulate a notification** to try wrong references and amounts.

### 4.3 Credit notes

1. Finance opens an invoice and chooses **Issue credit note**.
2. Validation: amount is required, greater than zero, and **cannot exceed the invoice balance**; a reason is mandatory (e.g. Learner no-shows, Pricing error).
3. Credit note ID `CN-000n` is created; the invoice's `creditNote` accumulates.
4. **If the invoice was already Synced to Workbook, it is flipped back to Pending** so the change is re-synced.
5. Timeline event and activity-feed entry are written.

### 4.4 Workbook (accounting) sync

```text
                     waiting for next sync window
                        ┌───────────────┐
        ┌──────────────▶│    PENDING    │◀───────────────┐
        │               └───────┬───────┘                │
        │             accepted  │  rejected              │ credit note
        │               (201)   │  (e.g. "Customer not   │ applied
        │                       │   found in Workbook")  │
        │               ┌───────┴───────┐                │
        │               ▼               ▼                │
        │        ┌───────────┐    ┌───────────┐          │
        │        │  SYNCED   │    │  FAILED   │          │
        │        └─────┬─────┘    └─────┬─────┘          │
        │              └────────────────┼────────────────┘
        │                               │ Resend / Resend all failed
        └───────────────────────────────┘ (becomes Synced)
```

- Every invoice has a Workbook status and an attempt log (Invoice and Payment attempts with Success / Failed / Queued).
- A payment cannot be allocated until its invoice has synced ("Waiting for invoice to sync first").
- Failures raise a high-severity alert linking to the filtered Workbook screen.

### 4.5 Alert Centre rules

| Alert | Trigger | Severity |
|---|---|---|
| Overdue invoices | Status Overdue, or Sent and past due date | High |
| Workbook sync failures | `wb === 'Failed'` | High |
| Resource clash | Sessions sharing date + venue/instructor/laptop trolley | Medium |
| Low fill | Scheduled session in next 21 days under **40%** full | Medium |
| Certificates expiring | Expiry within **90 days** | Low |

### 4.6 Reporting

Tabs for revenue, profitability and more, with comparisons and CSV export. Revenue history older than the seed (about four months) is **synthetic** (deterministic pseudo-random), cost ratios per category are illustrative (Health & Safety 58%, Leadership 50%, Compliance 42%, Cybersecurity 45%, Finance 52%, Project Management 55%, Soft Skills 47%). Views can be saved by Finance.

---

## 5. B2B client portal

### 5.1 Request a booking or quote -> staff pipeline

```text
  Client contact        Client portal             Staff Opportunities      Administrator
        │                    │                            │                     │
        │ Request booking    │                            │                     │
        │ (3-step wizard)    │                            │                     │
        │───────────────────▶│                            │                     │
        │                    │ validate: course,          │                     │
        │                    │ attendees 1-200,           │                     │
        │                    │ future date                │                     │
        │                    │ createClientLead()         │                     │
        │                    │───────────────────────────▶│ Enquiry created     │
        │                    │                            │ value = price x ppl │
        │                    │                            │ source "Client      │
        │                    │                            │ portal", task due   │
        │                    │                            │ next day            │
        │                    │ store request + oppId      │                     │
        │                    │                            │◀────────────────────│
        │                    │                            │ works the deal      │
        │                    │◀── requestView(): stage ───│ (needs, quote, won) │
        │◀── Requested /     │                            │                     │
        │    Confirmed + note│                            │                     │
```

The client sees the **staff-side stage translated** (`requestView`), so both sides never disagree:

| Staff stage | Client sees | Note |
|---|---|---|
| Enquiry | Requested | Received by the training team |
| Needs analysis | Requested | The training team is scoping your request |
| Quoted | Requested | A quote has been prepared for you; see your dashboard |
| Won | **Confirmed** | The training team has confirmed this request |
| Lost | Requested | Could not take this on as requested and will be in touch |

Wizard steps: Course -> When and where (preferred date must be in the future; delivery On site / At the training centre / Online; notes) -> Review with indicative price ex VAT. Expected close defaults to the preferred date if future, otherwise today + 14 days.

### 5.2 Managing learners

| Process | Rules |
|---|---|
| Add a learner | Creates a B2B learner with an `employer`-paid enrolment on the chosen course. |
| Bulk add (paste CSV) | Each line `name, email, course` (comma, semicolon or tab). Row errors: name under 3 characters; invalid email; email already used (including earlier rows in the same paste); course missing / not found / ambiguous (match by code, exact title, or partial title among **Active** courses). Valid rows only are imported. |
| Remove a learner from a booking | Only if the enrolment status is `Booked` (not started). Logged. |
| Transfer to another course | Only if not started and the learner is not already on the target course; re-points to the first upcoming Scheduled session if any. |

### 5.3 Booking status shown to clients

Bookings are grouped by session (or online course). Status: **Completed** if every enrolment is complete; **In progress** if anyone has started or the session date has arrived; otherwise **Confirmed**. Steps displayed: Requested -> Confirmed -> In progress -> Completed.

### 5.4 Compliance matrix

A staff x mandatory-certificate grid for the client, driven by job role.

| Certificate | Course | Validity |
|---|---|---|
| H&S Essentials | HSE-101 | 730 days |
| Working at Heights | HSE-210 | 730 days |
| First Aid | HSE-220 | 730 days |
| POPIA | POP-120 | 730 days |
| Cybersecurity | CYB-110 | 365 days |

Required certificates by job role: Driver (H&S, First Aid); Warehouse operator (H&S, Heights); Supervisor (H&S, Heights, First Aid, POPIA); Customer service and Office admin (H&S, POPIA, Cyber); Manager (H&S, First Aid, POPIA, Cyber); Staff (H&S).

Cell status logic: not required -> **N/A**. Best known expiry (platform certificates and legacy/uploaded ones) is used. Expired or never held: **Planned** if an open (not completed) enrolment exists, else **Missing**. Within **90 days** of expiry: **Expiring**. Otherwise **Valid**. Compliance score = (Valid + Expiring) / required cells. People not yet on the platform appear from the client roster.

### 5.5 Invoices and statements

Clients see only their organisation's invoices, a ledger (invoice debit, credit note +7 days, payment credit) with running balance, and an ageing summary. A client can pay an invoice online (card through PayGate, SnapScan or bank transfer); the invoice number is the payment reference, so the payment lands on that invoice (see [6.5](#65-paying-through-paygate-and-snapscan-production-design)).

---

## 6. B2C: catalogue, checkout and bookings

### 6.1 Browse and decide

Public catalogue (visible to every persona): faceted filters, compare (**maximum 3** courses), wishlist, reviews, waitlist for full sessions.

### 6.2 Checkout (B2C learners only)

```text
  ┌───────────────┐   ┌───────────────┐   ┌────────────────────────────┐
  │ 1 Choose date │──▶│ 2 Your details│──▶│ 3 Payment: card (PayGate), │
  │ seats left    │   │ name 3+ chars │   │ SnapScan QR or EFT         │
  └───────────────┘   └───────────────┘   └─────────────┬──────────────┘
                                                        ▼
                         Invoice raised first: its number (INV-0048) is the payment reference
                                                        ▼
                         Simulated notification (~650 ms per phase, always succeeds)
                         carries the invoice number and is matched to the invoice
                                                        │
      ┌───────────────┬──────────────┬─────────────┬────┴────────┬──────────────┬─────────────┐
      ▼               ▼              ▼             ▼             ▼              ▼
  Invoice paid   Receipt RCT-5xxx  Enrolment    Confirmation  Activity log   Coupon use
  + payment      (shows the        payer = self email → sent   "X booked      logged
  record         invoice number)   Booked, 0%   log           course"        (if applied)
```

The learner sees the invoice number on the payment step ("this is your payment reference"), and again on the receipt with the processor and transaction id. Card shows a PayGate payment page stand-in; SnapScan shows a QR code stand-in carrying the invoice number and amount; EFT shows bank details with the invoice number as the reference. The same three methods are used for Academies (one invoice per course) and for a client paying an invoice from the portal (see [6.5](#65-paying-through-paygate-and-snapscan-production-design)).

Pricing (`priceOrder`): the coupon discount comes off the **ex-VAT** price, then 15% VAT is added to the discounted net.

| Coupon | Discount |
|---|---|
| WELCOME10 | 10% |
| DEMO15 | 15% |
| STUDENT5 | 5% |

Academies (cohort bundles) get a fixed **10% bundle discount** on the sum of courses. Certificate renewals reuse checkout and carry a `renewal` reference.

*Demo only: payment is simulated here. The production design (PayGate and SnapScan, with the invoice number as the payment reference) is in [6.5](#65-paying-through-paygate-and-snapscan-production-design).*

### 6.3 Change or cancel a booking

```text
  Learner: Reschedule or cancel (enrolment is Booked)
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
     Reschedule               Cancel
  choose another session   refund % by days to start
  with free seats                │
          └──────────┬───────────┘
                     ▼
        Request stored: status REQUESTED
                     │
                     ▼
        Learning admin → Booking requests
                     │  Approve
          ┌──────────┴───────────┐
          ▼                      ▼
  seat check, move          release seat,
  enrolment                 log refund
          └──────────┬───────────┘
                     ▼
     learner emailed, request → APPROVED
```

Refund policy (`refundPct`): **more than 7 days before start = 100%; 0-7 days = 50%; after start = 0%**. Online (no-session) courses are fully refundable until started. Requests are recorded as `Requested` and land in **Learning admin -> Booking requests** (the tab shows the open count). An administrator approves them:

- **Reschedule**: moves the enrolment to the requested session, but only if that session is still Scheduled and has a free seat; otherwise approval is refused with a message.
- **Cancel**: releases the seat and logs the refund owed (receipt amount x the percentage quoted to the learner).
- Both only apply while the enrolment is still `Booked`. The learner is emailed (sent log), the request becomes `Approved`, and the learner's My bookings drops the "requested" pill. Refund payment itself is not modelled.

### 6.4 R2 services

| Service | Flow | Rules |
|---|---|---|
| Academies | View cohort, **Register interest** (toggle) or **Enrol now** (buys only courses not already held) | 10% bundle discount; enrolment tracked per learner with progress across the bundle. |
| Mentoring | Pick mentor -> pick an open 45-minute slot -> enter goals -> confirm | Slot unavailable if already taken for that mentor/time; at least one goal of 5+ characters. Session starts `Requested`; learner ticks goals and rates the session afterwards. |
| Certifications | Expiry timeline; **Renew** goes to checkout | Status: Expired; under 60 days = red; under 180 days = "Renew soon"; else Valid; no expiry = "Does not expire". |

### 6.5 Paying through PayGate and SnapScan (production design)

The demo simulates this flow end to end (see 6.2 and limitation 8), including the matching rules below. In production, payments are taken by **PayGate** (cards, on a hosted payment page) and **SnapScan** (QR code or app). They share one rule: **the invoice number is the payment reference**. It goes out with every payment request and comes back with the notification, so the platform always knows which invoice, and so which person or company, a payment belongs to. The technical design is in the Architecture document (D11, D8).

```text
  Invoice raised (INV-0042)       B2C: at booking, before payment
        │                         B2B: the existing invoice, "Pay online"
        ▼
  Payment page: invoice number and amount
        │
        ├── Card ──▶ PayGate hosted page     reference = INV-0042
        └── QR   ──▶ SnapScan app            reference = INV-0042
                              │
                              ▼
  Notification to the platform: invoice number, amount,
  transaction id, signature
                              │
                              ▼
  Signature valid and invoice number known? ──no──▶ Unmatched queue + alert to Finance
                              │ yes
                              ▼
  Amount equals the balance? ──no──▶ part payment / excess / duplicate: flagged for Finance
                              │ yes
                              ▼
  Transaction id already applied? ──yes──▶ ignore (safe repeat)
                              │ new
                              ▼
  Record payment against the invoice (who, what, when, how); settle invoice;
  confirm booking
        ├──▶ receipt and email quoting the invoice number
        └──▶ payment.settled → Workbook under the same invoice number
```

| Topic | Rule |
|---|---|
| Reference sent | The invoice number (for example INV-0042), in PayGate's reference field and SnapScan's merchant-reference field. Field names and length limits are to be confirmed with each provider. |
| Invoice before payment | B2C: the invoice is raised at booking, before the learner pays, with payer type "self". B2B: the existing invoice is paid from the client's invoice screen. Finance can also send a pay link or QR code for any open invoice. |
| Who paid what | The notification returns the invoice number; the invoice knows its organisation (B2B) or learner (B2C). The payment is stored against the invoice with the processor, its transaction id, the amount, method and time. |
| One application only | The processor plus its transaction id is the idempotency key. A repeated notification changes nothing. |
| Retries | A payer can try again; each try is a separate attempt on the same invoice. If a processor rejects a repeated reference, a short attempt suffix is added and stripped when matching (to confirm). |
| Methods | Card through PayGate's hosted page (card details never reach the platform). SnapScan by QR code or link scanned in the SnapScan app. Bank transfer (EFT) quotes the invoice number as the bank reference and is confirmed by Finance through Workbook; whether a processor will also carry EFT is to be confirmed. |
| Workbook | A settled payment is posted to Workbook under the same invoice number, once the invoice itself has synced. |
| Reconciliation | Each day the processors' settlement reports are compared with the platform's payments by invoice number; each night counts and totals are compared with Workbook. Differences are recorded. |

What happens to each notification:

| Notification | Result |
|---|---|
| Valid, invoice found, amount equals the balance | Payment recorded, invoice settled, booking confirmed (B2C), event sent to Workbook. |
| Valid, amount is less than the balance | Recorded as a part payment; the invoice stays open with the new balance. |
| Valid, amount is more than the balance | Invoice settled; the excess is flagged for Finance to refund or credit. |
| Valid, invoice already paid | Recorded and flagged as a duplicate payment for refund. |
| Invoice number missing, unknown or altered | Held in the unmatched queue; alert to Finance; nothing is settled until a person allocates it. |
| Signature or checksum invalid | Rejected with an error; alert raised. |
| Same transaction id again | Ignored: no change. |

Open with Finance: B2C invoices are raised at booking so their number can be the reference, so abandoned bookings need a rule (for example void with a credit note, keeping the tax-invoice sequence free of gaps), and it must be decided whether unpaid B2C invoices go to Workbook at once or only when paid.

---

## 7. LMS: learning and compliance

### 7.1 Learner journey (self-paced)

```text
  My learning (booked / in progress / completed)
        │
        ▼
  Open course player
        │
        ▼
  ┌─▶ Lesson (slides, video mock, notes, bookmarks)
  │     │ finish lesson → mark done, +minutes, +5 points, save progress
  │     ▼
  └─ All lessons done? ──no──┘
        │ yes
        ▼
  Knowledge check  (timed 6:00, pass mark 70%)
        │
        ▼
  Passed? ──yes──▶ +25 points (+40 if 100%) → completeCourse
        │                    └──▶ certificate issued
        │                         (attended = true, result default 80)
        no
        ▼
  Failed attempt +1
        │
        ▼
  3 failed attempts? ──no──▶ back to Knowledge check
        │ yes
        ▼
  LOCKED: review the lessons and unlock ──▶ back to Lessons
```

Key rules:

- The quiz opens only after all prior lessons are done (or the course is already completed, in which case it is an unrecorded **practice run**).
- Pass mark **70%**, **3** failed attempts then forced review, **6 minutes** timer. Feedback after each question.
- Progress only moves forward (`max`), and a completed enrolment is never regressed.
- On completion, `certFor` creates the certificate (validity per category, see 3.5), sends a congratulations email to the sent log and writes to the activity feed.
- Content (lessons, quizzes, resources) is generated deterministically from the course record; it is not real SCORM or video.
- The player also carries the pre- and post-course surveys: an optional (or, if Settings require it, blocking) pre-course survey before the first lesson, and a post-course survey on the completion screen that can hold back the certificate (see [7.5](#75-pre--and-post-course-surveys-microsoft-forms)).

### 7.2 Engagement mechanics

| Feature | Rule |
|---|---|
| Points | Certificate +100, started course +10, lesson +5, quiz pass +25 (+40 for 100%) |
| Levels | Newcomer 0, Explorer 100, Practitioner 250, Specialist 450, Expert 700, Master 1000 |
| Streak | Consecutive days with learning minutes, ending today or yesterday (so it is not lost before you study today) |
| Weekly goal | Minutes per week from Monday; reaching it unlocks "Goal getter" |
| Badges | 15, e.g. First finish (1 course), Hat-trick (3), High five (5), On a roll (3-day streak), Week warrior (7), Fortnight focus (14), Quiz ace (100%), Safety first, People person, Certified (2 certs), Bookworm (10 lessons) |
| Leaderboards | Workplace and community; peers are invented |

### 7.3 Skills, gaps and journeys

- **Skill level (0-3)** per skill: +1 when a course is started (progress above 0), +2 when completed, capped at 3.
- **Target role gap analysis**: roles Team leader, Project manager, Safety officer, Finance business partner, Compliance analyst each define required skill levels. Coverage % = sum of min(have, need) / sum of need. Learners can add self-assessments.
- **Recommendations** (`recommend`): first the next unfinished course on any journey the learner has started, then courses sharing skills with what they hold, then "Popular with learners like you" / "A good starting point". Only Active courses not already held; default limit 4.
- **Journeys**: ordered course paths. A learner can **request** a journey; the administrator **approves** it.

### 7.4 Administrator: assign and chase learning

```text
  ┌────────────────┐   ┌──────────────┐   ┌───────────────────┐   ┌────────────────┐
  │ 1 Pick learners│──▶│ 2 Pick course│──▶│ 3 Deadline,       │──▶│ 4 Review and   │
  │ staff only:    │   │              │   │ reminder cadence, │   │ confirm        │
  │ internal + B2B │   │              │   │ notify            │   │                │
  └────────────────┘   └──────────────┘   └───────────────────┘   └───────┬────────┘
                                                                          │
        ┌──────────────────────┬──────────────────────┬───────────────────┤
        ▼                      ▼                      ▼                   ▼
  Enrolments created     Email per learner     Assignment record    Learners who already
  payer internal or      → sent log            + activity log       have the course
  employer, Booked,                                                 are skipped
  deadline set
```

- Deadline must be today or later. Confirm is disabled if nobody new would be assigned.
- **Compliance matrix** (`cellStatus`): Complete; Overdue if deadline passed and not complete; Progress; Assigned; None. Compliance % = share of **mandatory** courses completed. Default mandatory set: HSE-101, POP-120, CYB-110 (toggleable).
- **Overdue and due-soon list**: open staff enrolments past deadline or due within 7 days, sorted by urgency. "Nudge" and "Nudge all overdue" send reminder emails and record the nudge time.

### 7.5 Pre- and post-course surveys (Microsoft Forms)

Every enrolment has two short surveys. The **pre-course** survey is answered before or during the course; the **post-course** survey opens when the course is complete. In production each is a Microsoft Form embedded in the site (iframe) and pre-filled with the course and enrolment. In the demo the form is simulated with the same questions, and the dialog shows the exact link it would embed.

```text
  Enrolment exists (checkout / assignment / client booking)
        │
        ▼
  PRE-COURSE SURVEY due  (any status except Completed)
    open from My learning, My bookings or the course player
    reminders: Learning admin → Surveys, or the class list ─────▶ sent log
        │
        ▼
  Required in Settings, and no lesson done yet? ──yes──▶ Player shows "Before you start";
        │ no                                             lessons stay hidden until answered
        ▼
  Delivery: classroom session or self-paced player
        │
        ▼
  Course completed (quiz passed, or instructor issues the certificate)
        ├──▶ certificate issued (as before)
        └──▶ POST-COURSE SURVEY invite email → sent log
        │
        ▼
  Required in Settings, and not yet answered? ──yes──▶ Certificate locked: view, print and
        │ no, or answered                              copy-link disabled until answered
        ▼
  Learning admin → Surveys: response rates, confidence uplift, NPS, comments
```

| Survey | Questions | Compulsory |
|---|---|---|
| Pre-course | Confidence in the topic (1-5); prior experience (None / Some / Extensive); what you hope to do afterwards (free text) | Confidence, experience |
| Post-course | Confidence in the topic (1-5, same question as before); content relevant to my work (1-5); course well delivered (1-5); would recommend (0-10); one improvement (free text) | Confidence, content, delivery, recommend |

Rules:

- **When each is due:** pre while the enrolment is not Completed; post only once it is Completed. One response per enrolment per survey; answering again replaces the earlier answers.
- **Links:** Settings -> Course surveys holds one Forms link for each survey. Merge fields `{code}`, `{course}`, `{enrolment}` and `{learner}` (email) are filled in per enrolment so the form can be pre-filled and the response matched back. A link must be `https` and on `forms.office.com`, `forms.cloud.microsoft` or `forms.microsoft.com`, otherwise Settings refuses to save.
- **Require pre-course survey** (default **off**): when on, an online learner who has not started sees a "Before you start" card in the player instead of the lessons until the survey is answered. When off, the player shows a reminder banner only.
- **Require post-course survey for certificate** (default **on**): the certificate is still issued and counts for compliance, but the completion screen hides it and disables Print and Copy verification link, and the "View" button in My learning is disabled, until the learner answers.
- **Emails** (all go to the sent log and activity feed, and are skipped when the survey is not due or already answered): the post-course invite is sent when the quiz is passed or when an instructor issues the certificate; reminders are sent by **Remind** / **Remind all** in Learning admin -> Surveys and by **Remind pre-course survey** on a class list. The pre-course invite is a reminder-only action in the demo (see [limitations](#11-gaps-fixed-and-remaining-limitations)).
- **Where learners see them:** a Surveys column in My learning, buttons on My bookings (pre on upcoming, post on past bookings), the player banner, gate and completion card.

Reporting (Learning admin -> Surveys, plus CSV export by course):

| Measure | Definition |
|---|---|
| Pre-course response rate | Enrolments with a pre-course answer / all enrolments |
| Post-course response rate | Completed enrolments with a post-course answer / completed enrolments |
| Confidence uplift | Average of (post confidence minus pre confidence), only for learners who answered both |
| Net promoter score | % answering 9-10 minus % answering 0-6 on the recommend question |
| Per course | Responses vs enrolments, average confidence before and after, uplift, content and delivery ratings, NPS |

The tab also lists who still owes each survey (with one-click reminders), the latest improvement comments, and the Forms links currently in force. Seed data gives completed courses both answers except a few post-course answers left open, and roughly half of booked enrolments a pre-course answer, so there is always something to chase.

---

## 8. Talent connection

### 8.1 Ringfencing (the core privacy rule)

> Only enrolments with `payer === 'self'` may ever feed a recruiter-visible profile.

This is enforced in code in `recruiterVisibleProfiles()`, independent of the opt-in flag:

```text
  All learners
      │
      ▼
  Opted in? ──no──▶ HIDDEN
      │ yes
      ▼
  At least one self-paid enrolment? ──no──▶ HIDDEN
      │ yes
      ▼
  Profile built from SELF-PAID enrolments only
  (employer and internal enrolments ignored)
      │
      ▼
  Learner visibility toggles can only REMOVE detail:
  region, course titles, skills, summary
      │
      ▼
  Visible to approved recruiters, anonymised by code TL-xxxx
```

- A learner with mixed history (self-paid and employer-paid) shows only the self-paid courses.
- Employer-paid and internal learners can never appear. The Talent admin "excluded learners" metric is computed live from the data.
- Hidden titles are replaced with "{category} course".

### 8.2 Learner flow

1. **Opt in** (B2C learners only): switch on the profile, which creates a `TL-` code and region (if none) and writes an **Opt-in** audit entry and a consent record.
2. Write a summary (saved on the profile), choose visibility toggles (region, titles, skills, summary).
3. **Withdraw** any time: Opt-out audit entry and consent record.
4. **Decide on introduction requests**: approve (optionally with a reply) or decline. Approval releases contact details; a "receipt" lists exactly what was shared and what is never shared. Every decision is written to the consent history and audit log.

### 8.3 Recruiter flow

```text
  Administrator        Recruiter            Talent search          Learner
       │                   │                      │                    │
       │◀── application ───│                      │                    │
       │ (pending)         │                      │                    │
       │ Approve, or       │                      │                    │
       │ Reject + reason   │                      │                    │
       │ (5+ chars)        │                      │                    │
       │── approved ──────▶│                      │                    │
       │                   │ search: filters /    │                    │
       │                   │ job brief ──────────▶│                    │
       │                   │◀─ anonymised, ranked │                    │
       │                   │ open profile ───────▶│ audit: View        │
       │                   │ shortlist / compare / note                │
       │                   │ request introduction + message            │
       │                   │ ─────────────────────────────────────────▶│ audit: Request
       │                   │                      │                    │ decides
       │                   │                      │                    │
       │                   │   APPROVED: contact details released,     │
       │                   │◀── thread opens ──────────────────────────│
       │                   │ pipeline: Introduced → Contacted →        │
       │                   │ Interview → Offer → Placed                │
       │                   │ (Placed sets intro.placed, logged)        │
       │                   │                                           │
       │                   │   DECLINED: nothing shared                │
       │                   │◀──────────────────────────────────────────│
```

- **Match score**: required skills weigh 3 points each, nice-to-haves 1 point; score = 100 x earned / (3 x required + nice). Ranking is by score, then by skill count; alternatives sort by newest or most skills.
- Skills can be extracted from a pasted job brief by name or alias (e.g. "scrum" -> Agile delivery, "popia" -> Data protection).
- **Filters**: text, skills (any/all), categories, region, soft vs technical focus (soft = at least 50% soft courses), minimum completed courses, availability.
- **Profile completeness** (0-100): summary 30, skills 20 (3 or more) or 10, region 10, at least one completed course 20, two or more courses 10, base 10.
- **Funnel**: Viewed -> Shortlisted -> Requested -> Approved -> Placed. Requested and shortlisted candidates count as viewed.
- A request is blocked when every approved recruiter already has a pending request with that learner (demo helper).

### 8.4 Administrator oversight

| Screen | Purpose |
|---|---|
| Approvals | Review recruiter applications. Approve, reject (reason required), or later revoke. Approval syncs the recruiter's `approved` flag. |
| Activity audit | Per-recruiter views, requests, approvals, declines, placements, last activity. |
| Ringfencing check | Live counts of excluded learners/enrolments, mixed-history learners, opted-in and visible profiles. |
| ROI report | Views, requests, approved, placed, average days to approval, estimated value = placements x salary x fee %; assumptions editable (fee %, salary, platform cost). Historical months are seeded. |

---

## 9. Administration

### 9.1 User management

Account types an administrator can create: Administrator, Finance, Instructor, Client contact, Internal learner, B2B learner, B2C learner, Recruiter.

| Rule | Detail |
|---|---|
| Validation | Name at least 2 characters; email valid and **unique across all people**; organisation required for client contact and B2B learner; company required for recruiter. |
| Recruiters | Created as **Pending** (`approved: false`); must be approved in Talent admin before searching. |
| Edit | Account type, role and organisation cannot be changed after creation. |
| Remove | **Blocked** while records point at the user: for learners, any enrolments, certificates, receipts or a talent profile; for staff, any sessions (reassign under Facilitators first) or quotes; for recruiters, any introduction requests. Accounts backing the demo personas can be edited but not removed. |
| Audit | Every add, edit, remove writes an activity-feed entry. |

### 9.2 Organisations, audit, access

- **Organisations**: directory with 360 view (contacts, learners, spend, open invoices, overdue count, enrolments).
- **Audit trail**: merges the activity feed (categorised Finance / Sales / Learning / Communications / Talent / General by keyword) with the talent audit log, newest first.
- **Access rules**: read-only matrix of screens x roles with a role simulator; this is the same model that drives navigation and route guards.
- **Settings**: a persisted screen for organisation profile, banking, document numbering, notifications, working hours, branding and **Course surveys (Microsoft Forms)**: the pre- and post-course form links and the two "require" switches (see [7.5](#75-pre--and-post-course-surveys-microsoft-forms)). Older saved settings are upgraded automatically with the survey defaults.

---

## 10. Cross-cutting rules

| Topic | Rule |
|---|---|
| VAT | 15% everywhere. Catalogue and quotes show ex-VAT; checkout and receipts add VAT. |
| Currency and dates | Rand (`R`), `en-ZA`; ISO dates internally. |
| Seed dates | Anchored to the first time the app opens, then stored; Reset demo re-anchors to today. |
| Activity feed | Almost every write process appends a line (opportunity moves, quote status, bookings, certificates, credit notes, resends, assignments, user changes). It is the source for the dashboard feed and part of the audit trail. |
| Notifications | Role-specific bell items (overdue invoices, deadlines, pending introductions, clashes). |
| Persistence | Browser `localStorage`, one store per area (main, money, ops, client, LMS, B2C, talent, admin settings, facilitators, resource register, course surveys). **Reset demo** clears them all via a reset registry. |
| Immutability pattern | Mutations clone the data object (`structuredClone`) then replace it; side effects such as activity log entries go through the same helper. |
| Tours | Eleven scripted stories that switch persona and screen: Opportunity to invoice, A self-paying learner, Talent connection and ringfencing, An instructor's day, How access works, Pre- and post-course surveys, A client books training, Needs analysis to quote, Assign and chase compliance, Getting paid, Reschedule or cancel a booking. |

---

## 11. Gaps fixed and remaining limitations

The first review of the code found the gaps below. Items 1-6 have been fixed (with tests in `src/tms/ops/handoff.test.ts`); items 7-12 are deliberate demo limitations.

### Fixed

| # | Gap found | Fix | Where |
|---|---|---|---|
| 1 | **No invoice creation.** Winning a deal or accepting a quote never produced an invoice; the "Opportunity to invoice" tour jumped to seed invoices. | Accepting a quote raises an invoice (next `INV-nnnn`, quote net ex VAT, 30-day terms, Workbook Pending) exactly once. A "Raise invoice" button covers already-accepted quotes. | `tms/ops/quoteActions.ts` (`raiseInvoice`, `nextInvoiceNumber`), `QuoteBuilder.tsx` |
| 2 | **Won did not lead to delivery.** Nothing prompted scheduling or enrolment after acceptance. | Two follow-up tasks (schedule sessions, enrol learners and confirm dates) are added to the opportunity, once only. | `quoteActions.ts` (`addHandoffTasks`) |
| 3 | **Reschedule and cancel requests were never approved**; no screen resolved them and no seat or refund changed. | New staff queue under Learning admin -> Booking requests. Approval moves the enrolment (reschedule, with seat check) or releases the seat and logs the refund (cancel), emails the learner and marks the request Approved. | `b2c/requestActions.ts`, `lms/admin/BookingRequests.tsx`, `b2cStore.ts` |
| 4 | **Stage probability defined twice** (percent in ops, fractions in money), able to drift apart. | One percentage table in `ops/logic.ts`; the money module derives its fractions from it. A test asserts they agree. | `tms/money/calc.ts` |
| 5 | **Certificate validity inconsistent.** Platform certificates for Cybersecurity never expired, while the client compliance matrix assumed 365 days. | One `CERT_VALIDITY_DAYS` table (Health & Safety 730, Compliance 730, Cybersecurity 365) used when issuing certificates. | `shared/store.ts` |
| 6 | **Two pass marks looked accidental** (50% classroom, 70% online) with the 50 buried in a screen. | Kept as policy (classroom is attended and assessed by an instructor, online is self-assessed) but the classroom value is now a named, documented constant next to the quiz one. | `ops/logic.ts` (`CLASS_PASS_MARK`), `ClassList.tsx` |

Not a gap after review: client booking requests do carry through to quoting. They enter as Enquiry opportunities, staff move them to Quoted by sending a quote, and the client's note changes accordingly (section 5.1).

### Remaining limitations (by design for a frontend-only demo)

7. **Single-owner defaults.** Client-portal leads are owned by staff `s1`; "All access" borrows fixed identities (Zanele, Marcus, Ayesha/Cape Freight, Naledi).
8. **Payment is a simulation.** PayGate and SnapScan are mocked: card, SnapScan and EFT always succeed after a short delay, and the notification is generated in the browser. The rules around it are real in the demo: the invoice is raised before payment, its number is the reference, notifications are matched to invoices, and part payments, overpayments, duplicates, unknown references and invalid signatures are handled (6.5). Refund payments are logged, not paid.
9. **Mocked integrations:** emails (preview and sent log only), Workbook (status flags and attempt log), Microsoft Forms (see 12), SCORM and video, AI summary, client single sign-on, online quote signature beyond a typed name, printing (browser print dialog).
10. **Invented history:** revenue older than the seed, cost ratios, campaign delivery stats, leaderboard peers, streak history and recruiter ROI history.
11. **Delivery is prompted, not automated.** Accepting a quote creates tasks, but a person still schedules the sessions and enrols the learners.
12. **Surveys are simulated, not embedded.** The demo shows a stand-in form with the real questions and the Forms link it would use; responses are saved in the browser. In production the page embeds the Microsoft Form (iframe), and a Power Automate flow or Microsoft Graph job writes each response back keyed on the `{enrolment}` merge field. The pre-course invite is not sent automatically when an enrolment is created (only reminders are), and the survey questions are fixed in code rather than editable per course.

---

## 12. Business rules quick reference

| Area | Rule | Value |
|---|---|---|
| Tax | VAT | 15% |
| Payment | Reference sent to PayGate and SnapScan | The invoice number |
| Pipeline | Stage probabilities | Enquiry 10, Needs 30, Quoted 60, Won 100, Lost 0 |
| Pipeline | Stage age warning / bad | over 14 / over 30 days |
| Quotes | Default validity | 30 days; warning at 7 days or fewer |
| Quotes | Terms minimum | 10 characters |
| Scheduling | Clash keys | Same date plus venue, instructor, units needed above stock for tracked equipment (Laptop trolley 1, Loan laptops 16 by default), or instructor unavailable; plus out-of-service venue or equipment |
| Scheduling | Suggest dates | Up to 5 weekdays, 21-day horizon |
| Delivery | Class-list pass mark | 50% (plus attendance); constant `CLASS_PASS_MARK` |
| Delivery | Low fill alert | under 40% full, next 21 days |
| Certificates | Validity | Health & Safety and Compliance 730 days, Cybersecurity 365 days, none otherwise |
| Certificates | Expiry alert / compliance "expiring" window | 90 days |
| Finance | Ageing buckets | Current, 1-30, 31-60, 61+ |
| Finance | DSO window | 90 days |
| Finance | Credit note cap | Invoice balance |
| Checkout | Coupons | WELCOME10 10%, DEMO15 15%, STUDENT5 5% |
| Checkout | Academy bundle discount | 10% |
| Refunds | More than 7 days / 0-7 days / started | 100% / 50% / 0% |
| Compare | Max courses | 3 |
| LMS | Quiz pass mark / attempts / time | 70% / 3 fails then lock / 6:00 |
| LMS | Mandatory courses (default) | HSE-101, POP-120, CYB-110 |
| LMS | Due-soon window | 7 days |
| Surveys | Pre-course due / post-course due | Enrolment not Completed / Completed |
| Surveys | Scales | Confidence, content, delivery 1-5; recommend 0-10 |
| Surveys | Net promoter score | % scoring 9-10 minus % scoring 0-6 |
| Surveys | Defaults | Pre-course required: off. Post-course required for certificate: on |
| Surveys | Allowed form hosts | forms.office.com, forms.cloud.microsoft, forms.microsoft.com (https only) |
| Client portal | Booking attendees | 1 to 200; start date must be in the future |
| Talent | Ringfence | Only `payer === 'self'` enrolments feed recruiter profiles |
| Talent | Match score | Required skill 3 points, nice-to-have 1 point |
| Talent | Soft-skills focus | At least 50% of courses are soft |
| Admin | Reject recruiter | Reason of 5+ characters |
| Admin | Remove user | Blocked while linked records exist |
