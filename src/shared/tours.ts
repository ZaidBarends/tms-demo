import type { Persona } from './types'

export interface TourStep { persona: Persona; path: string; title: string; text: string; explainer?: boolean }
export interface Tour { id: string; title: string; blurb: string; minutes: number; steps: TourStep[] }

export const TOURS: Tour[] = [
  {
    id: 'quote-to-cash', title: 'Opportunity to invoice', minutes: 4,
    blurb: 'Follow a sale from enquiry to paid invoice across Administrator, client and Finance.',
    steps: [
      { persona: 'admin', path: '/dashboard', title: 'The training manager’s view', text: 'Thandi sees the pipeline, seat fill, alerts and unpaid invoices at a glance. Everything here is derived from the same data you are about to change.' },
      { persona: 'admin', path: '/opportunities', title: 'Move a deal through the pipeline', text: 'Drag a card between stages, or open one for its detail panel. Moving a card is logged in the activity feed on the dashboard.' },
      { persona: 'admin', path: '/quotes/new', title: 'Build a quote', text: 'Add course lines, a discount, venue and instructor. The total is always subtotal less discount plus 15% VAT, and updates as you type.' },
      { persona: 'client', path: '/quotes', title: 'The client accepts online', text: 'Ayesha at Cape Freight sees only her own organisation’s quotes (never drafts) and gets an Accept button.' },
      { persona: 'finance', path: '/invoicing', title: 'Finance raises and tracks invoices', text: 'Pieter sees invoices, credit notes and payments received. Only Administrator and Finance can open money screens.' },
      { persona: 'finance', path: '/workbook', title: 'Sync to the accounting system', text: 'INV-0042 failed with “Customer not found in Workbook”. Press Resend and watch it turn Synced.' },
    ],
  },
  {
    id: 'learner-journey', title: 'A self-paying learner', minutes: 3,
    blurb: 'Browse, buy, learn and earn a certificate as Zanele.',
    steps: [
      { persona: 'b2c', path: '/catalogue', title: 'The public catalogue', text: 'Anyone can search and filter courses and see dates and prices.' },
      { persona: 'b2c', path: '/checkout', title: 'Checkout with a fake payment', text: 'Card or EFT, always succeeds after a short delay, then a receipt and a confirmation email preview. Nothing is charged or sent.' },
      { persona: 'b2c', path: '/my-learning', title: 'The course appears in My learning', text: 'Your new booking sits alongside progress, deadlines and certificates.' },
      { persona: 'b2c', path: '/learn', title: 'Take the course', text: 'Step through the lesson slides, the video placeholder and the short quiz. Passing issues a certificate.' },
      { persona: 'b2c', path: '/my-bookings', title: 'Bookings, receipts and certificates', text: 'Your receipt and certificate are now listed here.' },
    ],
  },
  {
    id: 'talent', title: 'Talent connection and ringfencing', minutes: 4,
    blurb: 'Opt in, get found, approve an introduction, and see why employer-paid learners never appear.',
    steps: [
      { persona: 'b2c', path: '/talent/settings', title: 'Zanele opts in', text: 'Switch the profile on. The panel shows exactly what a recruiter would see: anonymised, self-paid learning only.' },
      { persona: 'recruiter', path: '/talent/search', title: 'The recruiter finds her', text: 'Marcus searches anonymised profiles. Zanele now appears. Every profile view and request is written to the audit log.', explainer: true },
      { persona: 'recruiter', path: '/talent/search', title: 'Request an introduction', text: 'Press Request introduction on any candidate and add a short message. No contact details are visible yet.' },
      { persona: 'b2c', path: '/talent/introductions', title: 'The learner decides', text: 'Zanele approves or declines. Only after approval does the recruiter see her name and contact details.' },
      { persona: 'admin', path: '/talent/admin', title: 'Audit and ringfencing', text: 'The audit log shows every recruiter action. The ringfencing check counts the learners excluded because an employer paid, live from the data.', explainer: true },
    ],
  },
  {
    id: 'instructor-day', title: 'An instructor’s day', minutes: 2,
    blurb: 'Schedule, class list, attendance and resources.',
    steps: [
      { persona: 'instructor', path: '/my-schedule', title: 'My schedule', text: 'Naledi sees only the sessions assigned to her.' },
      { persona: 'instructor', path: '/sessions', title: 'Class list and attendance', text: 'Tick attendance, enter results, and issue certificates to those who pass.' },
      { persona: 'instructor', path: '/resources', title: 'Resource clashes', text: 'Two sessions share a room on the same day. The calendar highlights the clash in red.' },
    ],
  },
  {
    id: 'access', title: 'How access works', minutes: 2,
    blurb: 'The same screen through different eyes.',
    steps: [
      { persona: 'blearner', path: '/my-learning', title: 'An employer-paid learner', text: 'Johan sees only his own courses. His employer paid, so he has no talent profile.', explainer: true },
      { persona: 'blearner', path: '/talent/search', title: 'Opening a screen he cannot use', text: 'The demo switches to a persona who can open it, and tells you so. In the real product Johan would simply not see this screen.' },
      { persona: 'admin', path: '/admin/access', title: 'The access matrix', text: 'Navigation, route guards and this matrix are all generated from one model, so what you see here is exactly what is enforced.' },
      { persona: 'all', path: '/demo-map', title: 'All access and the Demo map', text: 'The presenter can open any screen from the Demo map without switching persona.' },
    ],
  },
  {
    id: 'surveys', title: 'Pre- and post-course surveys', minutes: 4,
    blurb: 'Measure what a course adds: Microsoft Forms surveys before and after, with results for the training manager.',
    steps: [
      { persona: 'admin', path: '/admin/settings', title: 'Link the Microsoft Forms', text: 'The Course surveys card holds one Forms link per survey and two switches: require the pre-course survey, and hold back the certificate until the post-course survey is answered. Links must be on a Microsoft Forms address.' },
      { persona: 'b2c', path: '/my-learning', title: 'Surveys beside each course', text: 'Zanele sees a Surveys column for every course: a button when a survey is due, a tick when answered. The post-course survey opens only after completion.' },
      { persona: 'b2c', path: '/learn', title: 'Pre-course survey in the player', text: 'Before the first lesson a banner (or a blocking card, if required in Settings) offers the pre-course survey. The dialog stands in for the embedded Microsoft Form and shows the link it would use.' },
      { persona: 'b2c', path: '/learn', title: 'Pass the quiz, then the post-course survey', text: 'Finish the course and the completion screen asks for the post-course survey. With the default setting the certificate stays locked until you answer.', explainer: true },
      { persona: 'instructor', path: '/sessions', title: 'Surveys on the class list', text: 'Naledi sees Pre and Post survey columns for each learner, can remind those who have not answered, and issuing certificates sends the post-course invite.' },
      { persona: 'admin', path: '/learning-admin?tab=surveys', title: 'Results: the Surveys tab', text: 'The Surveys tab shows response rates, confidence before and after, net promoter score, comments by course, and one-click reminders for anyone who still owes a survey.' },
    ],
  },
  {
    id: 'client-portal', title: 'A client books training', minutes: 4,
    blurb: 'Ayesha at Cape Freight requests training, manages staff, and watches compliance and invoices.',
    steps: [
      { persona: 'client', path: '/client/dashboard', title: 'The client dashboard', text: 'Ayesha sees only Cape Freight: upcoming bookings, compliance score and what she owes. Nothing from other clients is ever shown.' },
      { persona: 'client', path: '/client/bookings', title: 'Request a booking', text: 'The three-step wizard checks the course, 1 to 200 attendees and a future date, then shows an indicative price ex VAT. Submitting creates an opportunity for the training team.' },
      { persona: 'admin', path: '/opportunities', title: 'It lands in the pipeline', text: 'The request arrives as an Enquiry with source “Client portal”, valued at price times people, with a task to respond by tomorrow.' },
      { persona: 'client', path: '/client/learners', title: 'Manage your own staff', text: 'Add a learner, or paste a list with Bulk add. Rows with a bad email, duplicate or unknown course are rejected with the reason; valid rows are imported.' },
      { persona: 'client', path: '/client/compliance', title: 'The compliance matrix', text: 'Staff against mandatory certificates, by job role. Cells read Valid, Expiring, Planned, Missing or N/A, and the score counts Valid plus Expiring.' },
      { persona: 'client', path: '/client/invoices', title: 'Invoices and statements', text: 'Her organisation’s invoices, a running-balance ledger and an ageing summary.' },
    ],
  },
  {
    id: 'needs-to-quote', title: 'Needs analysis to quote', minutes: 4,
    blurb: 'Turn a client’s skills gaps into a recommended programme and a priced quote.',
    steps: [
      { persona: 'admin', path: '/tna', title: 'Run a needs analysis', text: 'Five steps: client, context, needs by department, course mapping and summary. Enter headcount and a gap from 0 to 4 per skill area.' },
      { persona: 'admin', path: '/tna', title: 'The recommendation engine', text: 'Priority comes from the headcount-weighted gap: High at 3 or more, Medium at 2 or more. Seats follow the departments with a gap of 2 or more, and the summary warns when the plan is over budget.', explainer: true },
      { persona: 'admin', path: '/quotes/new', title: 'Convert to a quote', text: 'From the summary, Convert to quote pre-fills the lines. Adjust discounts, venue and instructor; the total always updates as subtotal less discount plus 15% VAT.' },
      { persona: 'admin', path: '/quotes', title: 'Send, and the opportunity moves', text: 'Sending a quote moves a linked opportunity to Quoted. Accepting it (by the client or the administrator) marks the deal Won, raises the invoice once, and adds two delivery tasks.' },
      { persona: 'client', path: '/quotes', title: 'The client accepts', text: 'Ayesha ticks that she is authorised and types her name as an e-signature. Expired quotes cannot be accepted.' },
    ],
  },
  {
    id: 'compliance-chase', title: 'Assign and chase compliance', minutes: 5,
    blurb: 'Assign mandatory training, spot who is overdue, nudge them, and see the learner’s side.',
    steps: [
      { persona: 'admin', path: '/learning-admin?tab=assign', title: 'Assign a course', text: 'The Assign a course tab: pick learners, a course, a deadline and reminder cadence. People who already hold the course are skipped, and each learner is emailed.' },
      { persona: 'admin', path: '/learning-admin?tab=matrix', title: 'Compliance matrix', text: 'The matrix shows Complete, Overdue, Progress or Assigned against the mandatory courses (HSE-101, POP-120, CYB-110 by default). Compliance % is the share of mandatory courses completed.' },
      { persona: 'admin', path: '/learning-admin?tab=overdue', title: 'Overdue and due soon', text: 'Late and due-within-7-days enrolments, most urgent first. Nudge one learner, or Nudge all overdue; each sends a reminder email and records when.' },
      { persona: 'internal', path: '/my-learning', title: 'What Sipho sees', text: 'Assigned courses, deadlines in red when close, and who is paying (his organisation). A nudge arrives as an email in the sent log.' },
      { persona: 'internal', path: '/achievements', title: 'Points, streaks and badges', text: 'Lessons earn 5 points, passing a quiz 25 (40 for full marks) and a certificate 100. Streaks and a weekly goal keep people coming back.' },
      { persona: 'admin', path: '/communications', title: 'The sent log', text: 'Every assignment, nudge and survey reminder is recorded here. No email actually leaves the browser in the demo.' },
    ],
  },
  {
    id: 'collections', title: 'Getting paid', minutes: 4,
    blurb: 'Overdue invoices, reminders, credit notes and the accounting sync.',
    steps: [
      { persona: 'finance', path: '/finance/dashboard', title: 'Cash position', text: 'Pieter sees ageing buckets (Current, 1-30, 31-60, 61+), the biggest debtors and days sales outstanding.' },
      { persona: 'finance', path: '/invoicing', title: 'Remind and mark paid', text: 'Select overdue invoices and send reminders, which go to the client’s first contact and the sent log. Marking paid is bulk-capable and queues the payment for Workbook.' },
      { persona: 'finance', path: '/invoicing', title: 'Issue a credit note', text: 'Open an invoice and issue a credit note. The amount cannot exceed the balance and a reason is required. If the invoice had synced, it flips back to Pending to be re-synced.' },
      { persona: 'finance', path: '/workbook', title: 'Fix a failed sync', text: 'Failed records raise a high-severity alert. Resend, or Resend all failed, and watch them turn Synced. Payments wait until their invoice has synced.' },
      { persona: 'finance', path: '/reports', title: 'Revenue and profitability', text: 'Compare periods, drill into profitability by category and export to CSV. History older than the seed data is synthetic.' },
      { persona: 'client', path: '/client/invoices', title: 'The client’s view', text: 'Ayesha sees the same invoice with the credit note on her statement, and her ageing summary updates.' },
    ],
  },
  {
    id: 'change-booking', title: 'Reschedule or cancel a booking', minutes: 3,
    blurb: 'A self-paying learner changes plans and staff approve the request.',
    steps: [
      { persona: 'b2c', path: '/my-bookings', title: 'Request a change', text: 'Zanele picks Reschedule or cancel on a booked course. A cancellation shows the refund first: 100% more than 7 days out, 50% within 7 days, 0% once started.' },
      { persona: 'admin', path: '/learning-admin?tab=requests', title: 'Booking requests queue', text: 'The Booking requests tab holds the open request. Approving a reschedule moves the learner if the new session still has a seat; approving a cancellation releases the seat and logs the refund owed.' },
      { persona: 'admin', path: '/communications', title: 'The learner is emailed', text: 'Approval writes a confirmation to the sent log and the activity feed. Refund payment itself is not modelled.' },
      { persona: 'b2c', path: '/my-bookings', title: 'The booking is updated', text: 'The “requested” pill disappears and the booking shows its new date, or is gone if cancelled.' },
    ],
  },
]
