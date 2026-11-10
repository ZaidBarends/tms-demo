import type { Data, Invoice, Opportunity, Stage } from '../../shared/types'
import { addDays, daysBetween, fmtDate, money, parse, today, VAT_RATE } from '../../shared/format'
import { STAGE_PROB as STAGE_PCT } from '../ops/logic'
import { clashes, inclVat, invTotal, seatsTaken, clientName } from '../../shared/calc'

/* ------------------------------------------------------------------ basics */
export const PALETTE = { blue: '#597f2d', sky: '#92ca61', green: '#13a10e', orange: '#f7630c', purple: '#8764b8', grey: '#c4c9cf', red: '#c50f1f' }
export const GRID = '#8884'

export const balanceOf = (i: Invoice) => (i.status === 'Paid' ? 0 : Math.max(0, invTotal(i)))
export const daysPastDue = (i: Invoice, now: string) => (i.status === 'Paid' ? 0 : Math.max(0, daysBetween(i.due, now)))

export type Bucket = 'Current' | '1-30' | '31-60' | '61+'
export const BUCKETS: Bucket[] = ['Current', '1-30', '31-60', '61+']
export function bucketOfDays(days: number): Bucket {
  if (days <= 0) return 'Current'
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  return '61+'
}
export const bucketOf = (i: Invoice, now: string): Bucket => bucketOfDays(daysPastDue(i, now))

export function ageing(invoices: Invoice[], now: string) {
  return BUCKETS.map(bucket => {
    const rows = invoices.filter(i => i.status !== 'Paid' && bucketOf(i, now) === bucket)
    return { bucket, count: rows.length, amount: rows.reduce((a, i) => a + balanceOf(i), 0) }
  })
}

/** Days sales outstanding over a trailing window. */
export function dso(receivables: number, invoicedInWindow: number, windowDays = 90) {
  if (invoicedInWindow <= 0) return 0
  return Math.round((receivables / invoicedInWindow) * windowDays)
}

export const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const toCsv = (rows: unknown[][]) => rows.map(r => r.map(csvCell).join(',')).join('\n')

/* ------------------------------------------------------------ credit notes */
export function validateCredit(inv: Invoice, amountText: string, reason: string) {
  const errors: { amount?: string; reason?: string } = {}
  const amount = Number(amountText.replace(/[ ,R]/g, ''))
  if (!amountText.trim()) errors.amount = 'Enter the credit note amount'
  else if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be a number greater than zero'
  else if (amount > invTotal(inv) + 0.001) errors.amount = `Cannot exceed the invoice balance of ${money(invTotal(inv))}`
  if (!reason.trim()) errors.reason = 'Choose a reason'
  return { amount: Math.round(amount * 100) / 100, errors, ok: Object.keys(errors).length === 0 }
}

/* ----------------------------------------------------------------- ledger */
export interface LedgerRow {
  id: string; date: string; orgId?: string; learnerId?: string; category: string; description: string
  exVat: number; incl: number; paidOn?: string; paid: number; source: 'live' | 'history'
}
const CAT_WORDS: [RegExp, string][] = [
  [/heights|safety|h&s|first aid/i, 'Health & Safety'], [/supervisor|leadership/i, 'Leadership'], [/popia/i, 'Compliance'],
  [/cyber/i, 'Cybersecurity'], [/finance|budget/i, 'Finance Skills'], [/project|agile/i, 'Project Management'],
  [/soft|time management|store manager|emotional|conflict|communication/i, 'Soft Skills'],
]
export const categoryOfText = (t: string) => CAT_WORDS.find(([re]) => re.test(t))?.[1] ?? 'Soft Skills'
export const COST_RATIO: Record<string, number> = {
  'Health & Safety': 0.58, Leadership: 0.5, Compliance: 0.42, Cybersecurity: 0.45, 'Finance Skills': 0.52, 'Project Management': 0.55, 'Soft Skills': 0.47,
}
const CATS = Object.keys(COST_RATIO)
const rnd = (n: number) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x) }
export const monthStart = (now: string, offset: number) => {
  const d = parse(now); d.setDate(1); d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function buildLedger(data: Data, now = today(), months = 24): LedgerRow[] {
  const live: LedgerRow[] = data.invoices.map(i => ({
    id: i.number, date: i.issued, orgId: i.orgId, learnerId: i.learnerId, category: categoryOfText(i.description), description: i.description,
    exVat: i.amount - (i.creditNote ?? 0) / (1 + VAT_RATE), incl: invTotal(i), paidOn: i.status === 'Paid' && i.paidOn ? (i.paidOn > now ? now : i.paidOn) : undefined,
    paid: i.status === 'Paid' ? invTotal(i) : 0, source: 'live',
  }))
  const earliest = live.reduce((a, r) => (r.date < a ? r.date : a), now).slice(0, 7)
  const orgIds = data.orgs.map(o => o.id)
  const out: LedgerRow[] = []
  for (let m = months; m >= 1; m--) {
    const start = monthStart(now, -m)
    if (start.slice(0, 7) >= earliest) continue
    const season = 0.75 + rnd(m) * 0.5 + (m < 8 ? 0.1 : 0)
    const n = 4 + Math.floor(rnd(m + 40) * 4)
    for (let k = 0; k < n; k++) {
      const seed = m * 31 + k
      const cat = CATS[Math.floor(rnd(seed) * CATS.length)]
      const orgId = orgIds[Math.floor(rnd(seed + 7) * orgIds.length)]
      const exVat = Math.round((18000 + rnd(seed + 3) * 95000) * season / 500) * 500
      const date = addDays(start, 2 + k * 5)
      const paidOn = addDays(date, 18 + Math.floor(rnd(seed + 11) * 24))
      const isPaid = paidOn <= now
      out.push({
        id: `H-${start.slice(2, 4)}${start.slice(5, 7)}-${k + 1}`, date, orgId, category: cat, description: `${cat} training programme`,
        exVat, incl: exVat * (1 + VAT_RATE), paidOn: isPaid ? paidOn : undefined, paid: isPaid ? exVat * (1 + VAT_RATE) : 0, source: 'history',
      })
    }
  }
  return [...out, ...live].sort((a, b) => a.date.localeCompare(b.date))
}

export interface Bucketed { key: string; label: string; start: string; end: string; invoiced: number; collected: number; exVat: number; count: number }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Group ledger rows into weekly or monthly buckets between from and to (inclusive). */
export function bucketLedger(rows: LedgerRow[], from: string, to: string, mode: 'week' | 'month'): Bucketed[] {
  const out: Bucketed[] = []
  let cur = mode === 'month' ? from.slice(0, 7) + '-01' : from
  let guard = 0
  while (cur <= to && guard++ < 400) {
    let end: string
    if (mode === 'month') { const d = parse(cur); d.setMonth(d.getMonth() + 1); d.setDate(0); end = addDays(d, 0) }
    else end = addDays(cur, 6)
    const d0 = parse(cur)
    const label = mode === 'month' ? `${MONTHS[d0.getMonth()]} ${String(d0.getFullYear()).slice(2)}` : `${d0.getDate()} ${MONTHS[d0.getMonth()]}`
    const inB = rows.filter(r => r.date >= cur && r.date <= end)
    const coll = rows.filter(r => r.paidOn && r.paidOn >= cur && r.paidOn <= end)
    out.push({
      key: cur, label, start: cur, end, count: inB.length,
      invoiced: inB.reduce((a, r) => a + r.incl, 0), exVat: inB.reduce((a, r) => a + r.exVat, 0), collected: coll.reduce((a, r) => a + r.paid, 0),
    })
    cur = addDays(end, 1)
  }
  return out
}
export function monthlySeries(rows: LedgerRow[], now = today(), n = 12) {
  return bucketLedger(rows, monthStart(now, -(n - 1)), now, 'month')
}

/** Receivables as they stood on a past date (for "vs last month" deltas). */
export function receivablesAt(rows: LedgerRow[], at: string) {
  return rows.filter(r => r.date <= at && (!r.paidOn || r.paidOn > at)).reduce((a, r) => a + r.incl, 0)
}

export function deltaPct(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10
}

/** A believable 6-point series that ends on the real current value. */
export function fakeSeries(current: number, seed: number, n = 6, spread = 0.14) {
  const out: number[] = []
  let v = current
  for (let i = n - 1; i >= 0; i--) { out[i] = Math.round(v * 100) / 100; v = v * (1 + (rnd(seed + i) - 0.5) * 2 * spread) }
  return out
}

/* --------------------------------------------------------------- pipeline */
/** Stage win probability as a fraction, derived from the single percentage table in ops/logic. */
export const STAGE_PROB = Object.fromEntries(Object.entries(STAGE_PCT).map(([k, v]) => [k, v / 100])) as Record<Stage, number>
export function pipeline(opps: Opportunity[]) {
  const n = (f: (o: Opportunity) => boolean) => opps.filter(f)
  const reached = [
    { id: 'enquiry' as Stage, label: 'Enquiry', rows: opps },
    { id: 'needs' as Stage, label: 'Needs analysis', rows: n(o => ['needs', 'quoted', 'won'].includes(o.stage)) },
    { id: 'quoted' as Stage, label: 'Quoted', rows: n(o => ['quoted', 'won'].includes(o.stage)) },
    { id: 'won' as Stage, label: 'Won', rows: n(o => o.stage === 'won') },
  ]
  const funnel = reached.map((s, i) => ({
    ...s, deals: s.rows.length, value: s.rows.reduce((a, o) => a + o.value, 0),
    conversion: i === 0 ? 100 : reached[i - 1].rows.length ? Math.round((s.rows.length / reached[i - 1].rows.length) * 100) : 0,
  }))
  const open = opps.filter(o => o.stage !== 'won' && o.stage !== 'lost')
  const weighted = open.reduce((a, o) => a + o.value * STAGE_PROB[o.stage], 0)
  return { funnel, open, weighted, openValue: open.reduce((a, o) => a + o.value, 0) }
}

/* ----------------------------------------------------------------- alerts */
export interface Alert { id: string; kind: 'invoice' | 'workbook' | 'clash' | 'fill' | 'cert'; title: string; detail: string; severity: 'high' | 'medium' | 'low'; to: string; action: string; count: number }
export function buildAlerts(d: Data, now = today()): Alert[] {
  const out: Alert[] = []
  const overdue = d.invoices.filter(i => i.status === 'Overdue' || (i.status === 'Sent' && i.due < now))
  if (overdue.length) out.push({ id: 'overdue', kind: 'invoice', severity: 'high', count: overdue.length, title: `${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}`, detail: `${money(overdue.reduce((a, i) => a + balanceOf(i), 0))} past due, oldest ${Math.max(...overdue.map(i => daysPastDue(i, now)))} days`, to: '/finance/dashboard', action: 'Chase payment' })
  const failed = d.invoices.filter(i => i.wb === 'Failed')
  if (failed.length) out.push({ id: 'wb', kind: 'workbook', severity: 'high', count: failed.length, title: `${failed.length} Workbook sync failure${failed.length > 1 ? 's' : ''}`, detail: failed.map(i => `${i.number}: ${i.wbError ?? 'error'}`).join('; '), to: '/workbook?status=Failed', action: 'Review and resend' })
  const cl = clashes(d)
  const clashIds = Object.keys(cl)
  if (clashIds.length) {
    const first = d.sessions.find(s => s.id === clashIds[0])
    out.push({ id: 'clash', kind: 'clash', severity: 'medium', count: clashIds.length, title: `${clashIds.length} sessions in a resource clash`, detail: `${cl[clashIds[0]][0]}${first ? ` on ${fmtDate(first.start)}` : ''}`, to: '/resources', action: 'Resolve clash' })
  }
  const low = d.sessions.filter(s => s.status === 'Scheduled' && s.start >= now && s.start <= addDays(now, 21) && seatsTaken(d, s.id) / s.capacity < 0.4)
  if (low.length) out.push({ id: 'fill', kind: 'fill', severity: 'medium', count: low.length, title: `${low.length} session${low.length > 1 ? 's' : ''} under 40% full in the next 3 weeks`, detail: low.slice(0, 2).map(s => `${d.courses.find(c => c.id === s.courseId)?.title} (${seatsTaken(d, s.id)}/${s.capacity})`).join('; '), to: `/sessions/${low[0].id}`, action: 'Open session' })
  const expiring = d.certificates.filter(c => c.expires && c.expires >= now && c.expires <= addDays(now, 90))
  if (expiring.length) out.push({ id: 'cert', kind: 'cert', severity: 'low', count: expiring.length, title: `${expiring.length} certificate${expiring.length > 1 ? 's' : ''} expiring within 90 days`, detail: 'Offer renewals before they lapse', to: '/learning-admin', action: 'Plan renewals' })
  return out
}

/* ------------------------------------------------------------ line items */
export function invoiceLines(i: Invoice) {
  if (i.learnerId) return [{ description: i.description, qty: 1, unit: i.amount }]
  const materials = Math.round(i.amount * 0.12 / 50) * 50
  const tuition = i.amount - materials
  const seats = Math.max(1, Math.round(tuition / 2400))
  return [
    { description: `${i.description}: tuition`, qty: seats, unit: Math.round((tuition / seats) * 100) / 100 },
    { description: 'Learner materials, venue and equipment', qty: 1, unit: materials },
  ]
}

export function debtors(d: Data, now = today()) {
  const m = new Map<string, { name: string; balance: number; overdue: number; oldest: number; count: number; orgId?: string }>()
  d.invoices.filter(i => i.status !== 'Paid').forEach(i => {
    const k = i.orgId ?? i.learnerId ?? 'x'
    const r = m.get(k) ?? { name: clientName(d, i), balance: 0, overdue: 0, oldest: 0, count: 0, orgId: i.orgId }
    r.balance += balanceOf(i); r.count++
    const dp = daysPastDue(i, now)
    if (dp > 0) r.overdue += balanceOf(i)
    r.oldest = Math.max(r.oldest, dp)
    m.set(k, r)
  })
  return Array.from(m.values()).sort((a, b) => b.balance - a.balance)
}
export { inclVat }
