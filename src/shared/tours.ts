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
]
