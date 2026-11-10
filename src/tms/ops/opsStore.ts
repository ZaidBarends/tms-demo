import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { registerReset } from '../../shared/resetRegistry'
import { addDays, today } from '../../shared/format'
import type { QuoteLine } from '../../shared/types'
import type { Dept } from './logic'

/* ------------------------------- types -------------------------------- */
export interface OppTask { id: string; text: string; due: string; done: boolean }
export interface OppNote { id: string; at: string; text: string }
export interface OppEvent { id: string; at: string; text: string }
export interface OppExtra {
  owner: string; probability?: number; stageSince: string; source: string
  reason?: string; tasks: OppTask[]; notes: OppNote[]; events: OppEvent[]
}
export interface QuoteMeta {
  terms: string; validityDays: number; lineMeta: { list: number; disc: number }[]
  oppId?: string; signedBy?: string; signedAt?: string; sentAt?: string; internalNote?: string; invoiceNumber?: string
}
export interface QuoteVersion { id: string; at: string; by: string; label: string; lines: QuoteLine[]; discountPct: number; total: number }
export interface MaterialItem { id: string; label: string; done: boolean }
export interface WaitItem { id: string; learnerId: string; added: string }
export interface SessionExtra {
  notes: string; materials: MaterialItem[]; waitlist: WaitItem[]
  feedback?: { rating: number; strengths: string; improve: string; at: string }
  checklist: Record<string, boolean>
}
export interface Lesson { id: string; title: string; minutes: number; kind: 'Lecture' | 'Practical' | 'Discussion' | 'Assessment' }
export interface Tier { id: string; name: string; minSeats: number; discountPct: number }
export interface CourseExtra { lessons: Lesson[]; prereqs: string[]; tiers: Tier[] }
export interface TnaProfile {
  drivers: string[]; goal: string; budget: number; timeframe: string; headcount: number; depts: Dept[]
}

interface OpsState {
  opp: Record<string, OppExtra>
  quoteMeta: Record<string, QuoteMeta>
  quoteVersions: Record<string, QuoteVersion[]>
  sess: Record<string, SessionExtra>
  course: Record<string, CourseExtra>
  tnaProfile: Record<string, TnaProfile>
  unavailable: Record<string, string[]>
  patchOpp: (id: string, fn: (o: OppExtra) => OppExtra) => void
  setQuoteMeta: (id: string, m: QuoteMeta) => void
  addQuoteVersion: (id: string, v: QuoteVersion) => void
  patchSess: (id: string, fn: (s: SessionExtra) => SessionExtra) => void
  setCourse: (id: string, c: CourseExtra) => void
  setTnaProfile: (orgId: string, p: TnaProfile) => void
  toggleUnavailable: (instructorId: string, date: string) => void
  resetOps: () => void
}

/* ------------------------------ defaults ------------------------------- */
export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 10000).toString(36)}`
export const DEFAULT_TERMS = 'Payment within 30 days of invoice. Venue and instructor are confirmed on acceptance. Cancellations less than 7 days before the session are charged at 50%. Prices exclude VAT unless stated.'
export const defaultOpp = (): OppExtra => ({ owner: 's1', stageSince: today(), source: 'Direct', tasks: [], notes: [], events: [] })
export const defaultMaterials = (): MaterialItem[] => ['Learner workbooks printed', 'Attendance register', 'Certificates and stationery', 'Assessment papers', 'Projector and laptop tested', 'Refreshments confirmed']
  .map((label, i) => ({ id: `mat${i}`, label, done: false }))
export const defaultSess = (): SessionExtra => ({ notes: '', materials: defaultMaterials(), waitlist: [], checklist: {} })

const L = (id: string, title: string, minutes: number, kind: Lesson['kind']): Lesson => ({ id, title, minutes, kind })
export function defaultCourseExtra(hours: number): CourseExtra {
  const total = Math.max(1, hours) * 60
  const part = (f: number) => Math.round((total * f) / 15) * 15 || 15
  return {
    lessons: [
      L('l1', 'Welcome and learning outcomes', part(0.06), 'Lecture'),
      L('l2', 'Core concepts and legislation', part(0.3), 'Lecture'),
      L('l3', 'Case discussion in small groups', part(0.2), 'Discussion'),
      L('l4', 'Practical workshop', part(0.3), 'Practical'),
      L('l5', 'Assessment and feedback', part(0.14), 'Assessment'),
    ],
    prereqs: [],
    tiers: [{ id: 't1', name: 'Standard', minSeats: 1, discountPct: 0 }, { id: 't2', name: 'Team (10+ seats)', minSeats: 10, discountPct: 8 }, { id: 't3', name: 'Corporate (25+ seats)', minSeats: 25, discountPct: 15 }],
  }
}

/* -------------------------------- seed --------------------------------- */
function seedOps() {
  const d = (n: number) => addDays(today(), n)
  const iso = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
  const t = (text: string, due: number, done = false): OppTask => ({ id: uid('tk'), text, due: d(due), done })
  const ev = (text: string, ago: number): OppEvent => ({ id: uid('ev'), at: iso(-ago), text })
  const mk = (owner: string, since: number, source: string, tasks: OppTask[], events: OppEvent[], notes: OppNote[] = [], extra: Partial<OppExtra> = {}): OppExtra =>
    ({ owner, stageSince: d(-since), source, tasks, events, notes, ...extra })
  const opp: Record<string, OppExtra> = {
    p1: mk('s1', 6, 'Referral', [t('Follow up on quote Q-2026-011', 2), t('Confirm depot dates with operations', 5)], [ev('Opportunity created from client enquiry', 20), ev('Moved to Needs analysis', 14), ev('Quote Q-2026-011 sent', 6)], [{ id: uid('nt'), at: iso(-5), text: 'Ayesha asked for a single consolidated invoice for both depots.' }]),
    p2: mk('s6', 9, 'Existing client', [t('Run needs workshop with operations head', 8), t('Draft programme outline', 12)], [ev('Opportunity created', 16), ev('Moved to Needs analysis', 9)]),
    p3: mk('s1', 5, 'Tender', [], [ev('Opportunity created', 80), ev('Quote Q-2026-014 accepted', 55), ev('Moved to Won', 5)], [], { reason: 'Price and on-site delivery' }),
    p4: mk('s6', 3, 'Inbound call', [t('Send first aid price list', 1), t('Call Gerhard about headcount', 4)], [ev('Opportunity created from inbound call', 3)]),
    p5: mk('s6', 21, 'Website enquiry', [t('Send case study to Nandi', 3), t('Chase decision', 9)], [ev('Opportunity created', 40), ev('Moved to Quoted', 21)], [{ id: uid('nt'), at: iso(-10), text: 'Competitor is about 8% cheaper. Emphasise facilitator quality.' }]),
    p6: mk('s1', 12, 'Referral', [], [ev('Opportunity created', 50), ev('Moved to Won', 12)], [], { reason: 'Online delivery fitted their shifts' }),
    p7: mk('s1', 33, 'Tender', [t('Prepare council sign-off pack', 10), t('Book budget committee slot', 18)], [ev('Opportunity created', 45), ev('Moved to Needs analysis', 33)]),
    p8: mk('s6', 2, 'Referral', [t('Share sample phishing simulation', 6)], [ev('Opportunity created', 2)]),
    p9: mk('s6', 20, 'Existing client', [], [ev('Opportunity created', 60), ev('Moved to Lost', 20)], [], { reason: 'Went in-house' }),
    p10: mk('s1', 10, 'Existing client', [t('Walk Rochelle through the bundle', 2)], [ev('Opportunity created', 30), ev('Moved to Quoted', 10)]),
    p11: mk('s6', 38, 'Existing client', [t('Qualify intake dates', 3)], [ev('Opportunity created', 38)]),
    p12: mk('s1', 7, 'Referral', [t('Scope pilot cohort of 12', 6)], [ev('Opportunity created', 14), ev('Moved to Needs analysis', 7)]),
  }
  const lineMeta = (ls: QuoteLine[]) => ls.map(l => ({ list: l.unit, disc: 0 }))
  const ql = (courseId: string, qty: number, unit: number): QuoteLine => ({ courseId, qty, unit })
  const quoteMeta: Record<string, QuoteMeta> = {
    q1: { terms: DEFAULT_TERMS, validityDays: 30, lineMeta: lineMeta([ql('k1', 40, 2400), ql('k2', 12, 3950)]), oppId: 'p1', sentAt: d(-5) },
    q2: { terms: DEFAULT_TERMS, validityDays: 30, lineMeta: lineMeta([ql('k5', 10, 6500)]), signedBy: 'Ayesha Patel', signedAt: new Date(Date.now() - 35 * 864e5).toISOString() },
  }
  const quoteVersions: Record<string, QuoteVersion[]> = {
    q1: [
      { id: 'v1', at: iso(-8), by: 'Thandi Mokoena', label: 'First draft', lines: [ql('k1', 30, 2400), ql('k2', 12, 3950)], discountPct: 5, total: (30 * 2400 + 12 * 3950) * 0.95 * 1.15 },
      { id: 'v2', at: iso(-6), by: 'Thandi Mokoena', label: 'Increased depot A headcount, discount raised', lines: [ql('k1', 40, 2400), ql('k2', 12, 3950)], discountPct: 10, total: (40 * 2400 + 12 * 3950) * 0.9 * 1.15 },
    ],
    q6: [{ id: 'v1', at: iso(-13), by: 'Ruan Pretorius', label: 'Issued to client', lines: [ql('k12', 15, 2950), ql('k14', 15, 3800), ql('k15', 15, 1950)], discountPct: 10, total: (15 * 2950 + 15 * 3800 + 15 * 1950) * 0.9 * 1.15 }],
  }
  const sess: Record<string, SessionExtra> = {
    x1: { ...defaultSess(), notes: 'Strong group. Two learners arrived late because of roadworks on the N1.', materials: defaultMaterials().map(m => ({ ...m, done: true })), feedback: { rating: 4, strengths: 'Practical workshop kept energy high.', improve: 'Need a second projector for the breakaway groups.', at: iso(-3) } },
    x2: { ...defaultSess(), waitlist: [{ id: 'w1', learnerId: 'l10', added: d(-2) }, { id: 'w2', learnerId: 'l12', added: d(-1) }] },
    x3: { ...defaultSess(), waitlist: [{ id: 'w3', learnerId: 'l14', added: d(-4) }] },
  }
  const course: Record<string, CourseExtra> = {
    k2: {
      lessons: [L('l1', 'Legislation and employer duties', 60, 'Lecture'), L('l2', 'Fall hazard identification', 90, 'Discussion'), L('l3', 'Harness inspection and donning', 120, 'Practical'), L('l4', 'Anchor points and lanyards', 120, 'Practical'), L('l5', 'Rescue planning', 90, 'Practical'), L('l6', 'Written and practical assessment', 60, 'Assessment')],
      prereqs: ['k1'],
      tiers: [{ id: 't1', name: 'Standard', minSeats: 1, discountPct: 0 }, { id: 't2', name: 'Site team (10+ seats)', minSeats: 10, discountPct: 10 }, { id: 't3', name: 'Shaft programme (40+ seats)', minSeats: 40, discountPct: 15 }],
    },
  }
  const dept = (id: string, name: string, headcount: number, gaps: Record<string, number>): Dept => ({ id, name, headcount, gaps })
  const tnaProfile: Record<string, TnaProfile> = {
    o1: {
      drivers: ['Compliance audit', 'Staff turnover'], goal: 'Every depot employee holds a current safety certificate and new team leaders are supervisor-ready by March.', budget: 450000, timeframe: 'Next 6 months', headcount: 120,
      depts: [
        dept('d1', 'Depot operations', 55, { 'Health & Safety': 4, Leadership: 2, 'Project Management': 0, 'Finance Skills': 0, Cybersecurity: 1, Compliance: 2, 'Soft Skills': 1 }),
        dept('d2', 'Customer service', 25, { 'Health & Safety': 1, Leadership: 1, 'Project Management': 0, 'Finance Skills': 0, Cybersecurity: 3, Compliance: 3, 'Soft Skills': 3 }),
        dept('d3', 'Finance and admin', 15, { 'Health & Safety': 0, Leadership: 1, 'Project Management': 1, 'Finance Skills': 2, Cybersecurity: 3, Compliance: 4, 'Soft Skills': 1 }),
        dept('d4', 'Management', 12, { 'Health & Safety': 1, Leadership: 3, 'Project Management': 3, 'Finance Skills': 2, Cybersecurity: 1, Compliance: 1, 'Soft Skills': 2 }),
      ],
    },
    o4: {
      drivers: ['Budget cycle', 'New legislation'], goal: 'Budget holders can read variance reports and defend their departmental budgets.', budget: 300000, timeframe: 'Next 12 months', headcount: 600,
      depts: [
        dept('d1', 'Finance', 40, { 'Health & Safety': 0, Leadership: 1, 'Project Management': 1, 'Finance Skills': 4, Cybersecurity: 2, Compliance: 3, 'Soft Skills': 1 }),
        dept('d2', 'Community services', 120, { 'Health & Safety': 3, Leadership: 2, 'Project Management': 1, 'Finance Skills': 2, Cybersecurity: 1, Compliance: 2, 'Soft Skills': 3 }),
        dept('d3', 'Technical services', 90, { 'Health & Safety': 4, Leadership: 2, 'Project Management': 3, 'Finance Skills': 1, Cybersecurity: 0, Compliance: 1, 'Soft Skills': 1 }),
      ],
    },
  }
  const unavailable: Record<string, string[]> = { s3: [], s4: [d(10), d(11)], s5: [d(14)] }
  return { opp, quoteMeta, quoteVersions, sess, course, tnaProfile, unavailable }
}

/* ------------------------------- store --------------------------------- */
const mem: Record<string, string> = {}
const memStorage: StateStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v }, removeItem: k => { delete mem[k] } }
const safeStorage = createJSONStorage(() => {
  try { if (typeof localStorage !== 'undefined' && localStorage) { localStorage.getItem('ops-probe'); return localStorage } } catch { /* fall back */ }
  return memStorage
})

export const useOps = create<OpsState>()(
  persist(
    (set) => ({
      ...seedOps(),
      patchOpp: (id, fn) => set(s => ({ opp: { ...s.opp, [id]: fn(s.opp[id] ?? defaultOpp()) } })),
      setQuoteMeta: (id, m) => set(s => ({ quoteMeta: { ...s.quoteMeta, [id]: m } })),
      addQuoteVersion: (id, v) => set(s => ({ quoteVersions: { ...s.quoteVersions, [id]: [...(s.quoteVersions[id] ?? []), v] } })),
      patchSess: (id, fn) => set(s => ({ sess: { ...s.sess, [id]: fn(s.sess[id] ?? defaultSess()) } })),
      setCourse: (id, c) => set(s => ({ course: { ...s.course, [id]: c } })),
      setTnaProfile: (orgId, p) => set(s => ({ tnaProfile: { ...s.tnaProfile, [orgId]: p } })),
      toggleUnavailable: (iid, date) => set(s => {
        const cur = s.unavailable[iid] ?? []
        return { unavailable: { ...s.unavailable, [iid]: cur.includes(date) ? cur.filter(x => x !== date) : [...cur, date] } }
      }),
      resetOps: () => set(seedOps()),
    }),
    {
      name: 'ops-sched-v1', version: 1, storage: safeStorage,
      partialize: s => ({ opp: s.opp, quoteMeta: s.quoteMeta, quoteVersions: s.quoteVersions, sess: s.sess, course: s.course, tnaProfile: s.tnaProfile, unavailable: s.unavailable }),
    },
  ),
)
registerReset(() => useOps.getState().resetOps())

export const useOppExtra = (id: string) => useOps(s => s.opp[id]) ?? defaultOpp()
export const useSessExtra = (id: string) => useOps(s => s.sess[id]) ?? defaultSess()
