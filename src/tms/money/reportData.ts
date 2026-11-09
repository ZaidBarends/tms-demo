import type { Data } from '../../shared/types'
import { addDays, daysBetween, today } from '../../shared/format'
import { seatsTaken } from '../../shared/calc'
import { COST_RATIO, balanceOf, bucketLedger } from './calc'
import type { LedgerRow } from './calc'

export const PRESETS: { id: string; label: string; from: number; to: number }[] = [
  { id: '30', label: 'Last 30 days', from: -30, to: 0 },
  { id: '90', label: 'Last 90 days', from: -90, to: 0 },
  { id: '180', label: 'Last 6 months', from: -180, to: 0 },
  { id: '365', label: 'Last 12 months', from: -365, to: 0 },
  { id: 'ytd', label: 'Year to date', from: 0, to: 0 },
  { id: 'fwd', label: 'Next 90 days', from: 0, to: 90 },
  { id: 'sched', label: 'Full schedule (past and future)', from: -365, to: 365 },
]
export interface Range { from: string; to: string }
export function rangeOf(preset: string, now: string): Range {
  if (preset === 'ytd') return { from: `${now.slice(0, 4)}-01-01`, to: now }
  const p = PRESETS.find(x => x.id === preset) ?? PRESETS[2]
  return { from: addDays(now, p.from), to: addDays(now, p.to) }
}
export function previousRange(r: Range): Range {
  const len = daysBetween(r.from, r.to) + 1
  const to = addDays(r.from, -1)
  return { from: addDays(to, -(len - 1)), to }
}

export interface Filters { org: string; cat: string; instructor: string; venue: string }
export type Table = { head: string[]; rows: (string | number)[][] }
const short = (s: string, n = 20) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const inR = (date: string, r: Range) => date >= r.from && date <= r.to

export const ledgerIn = (rows: LedgerRow[], r: Range, f: Filters) => rows.filter(x => inR(x.date, r) && (!f.org || x.orgId === f.org) && (!f.cat || x.category === f.cat))

/* -- revenue ------------------------------------------------------------- */
export function revenueReport(rows: LedgerRow[], r: Range, f: Filters, compare: boolean, drill: string | null, orgName: (id?: string) => string) {
  const mode = daysBetween(r.from, r.to) > 100 ? 'month' : 'week'
  const cur = ledgerIn(rows, r, f), prevR = previousRange(r), prev = ledgerIn(rows, prevR, f)
  const a = bucketLedger(cur, r.from, r.to, mode), b = bucketLedger(prev, prevR.from, prevR.to, mode)
  const chart = a.map((x, i) => ({ key: x.key, label: x.label, Revenue: Math.round(x.exVat), Collected: Math.round(x.collected / 1.15), Previous: compare ? Math.round(b[i]?.exVat ?? 0) : undefined }))
  const sel = drill ? cur.filter(x => { const bk = a.find(y => y.key === drill); return bk ? x.date >= bk.start && x.date <= bk.end : true }) : cur
  const table: Table = {
    head: ['Reference', 'Date', 'Client', 'Category', 'Description', 'Revenue ex VAT', 'Total incl VAT', 'Collected'],
    rows: sel.sort((x, y) => y.date.localeCompare(x.date)).map(x => [x.id, x.date, x.orgId ? orgName(x.orgId) : 'Self-paying learner', x.category, x.description, Math.round(x.exVat), Math.round(x.incl), x.paid ? 'Yes' : 'No']),
  }
  const total = cur.reduce((s, x) => s + x.exVat, 0), prevTotal = prev.reduce((s, x) => s + x.exVat, 0)
  return { chart, table, total, prevTotal, count: cur.length, mode }
}

/* -- utilisation ---------------------------------------------------------- */
const sessionsIn = (d: Data, r: Range, f: Filters) => d.sessions.filter(s => s.status !== 'Cancelled' && inR(s.start, r)
  && (!f.instructor || s.instructorId === f.instructor) && (!f.venue || s.venue === f.venue)
  && (!f.cat || d.courses.find(c => c.id === s.courseId)?.category === f.cat))

function utilFor(d: Data, r: Range, f: Filters) {
  const m = new Map<string, { title: string; sessions: number; cap: number; taken: number }>()
  sessionsIn(d, r, f).forEach(s => {
    const c = d.courses.find(x => x.id === s.courseId)!
    const row = m.get(c.id) ?? { title: c.title, sessions: 0, cap: 0, taken: 0 }
    row.sessions++; row.cap += s.capacity; row.taken += seatsTaken(d, s.id); m.set(c.id, row)
  })
  return m
}
export function utilisationReport(d: Data, r: Range, f: Filters, compare: boolean) {
  const cur = utilFor(d, r, f), prev = utilFor(d, previousRange(r), f)
  const keys = Array.from(cur.keys())
  const chart = keys.map(k => { const x = cur.get(k)!; return { name: short(x.title), 'Seat fill %': pct(x.taken, x.cap), Previous: compare ? pct(prev.get(k)?.taken ?? 0, prev.get(k)?.cap ?? 0) : undefined } })
  const table: Table = { head: ['Course', 'Sessions', 'Seats', 'Booked', 'Fill %', 'Previous fill %'], rows: keys.map(k => { const x = cur.get(k)!, p = prev.get(k); return [x.title, x.sessions, x.cap, x.taken, pct(x.taken, x.cap), p ? pct(p.taken, p.cap) : '–'] }) }
  const cap = Array.from(cur.values()).reduce((a, x) => a + x.cap, 0), taken = Array.from(cur.values()).reduce((a, x) => a + x.taken, 0)
  const pc = Array.from(prev.values()).reduce((a, x) => a + x.cap, 0), pt = Array.from(prev.values()).reduce((a, x) => a + x.taken, 0)
  return { chart, table, fill: pct(taken, cap), prevFill: pct(pt, pc), sessions: Array.from(cur.values()).reduce((a, x) => a + x.sessions, 0), cap, taken }
}

/* -- attendance ----------------------------------------------------------- */
function attFor(d: Data, r: Range, f: Filters) {
  const ids = new Set(sessionsIn(d, r, f).map(s => s.id))
  const selfPaced = !f.instructor && !f.venue
  const es = d.enrolments.filter(e => (e.sessionId ? ids.has(e.sessionId) : selfPaced && r.to >= today() && r.from <= today())
    && (!f.org || e.orgId === f.org) && (!f.cat || d.courses.find(c => c.id === e.courseId)?.category === f.cat))
  const m = new Map<string, { title: string; enrolled: number; attended: number; completed: number; results: number[] }>()
  es.forEach(e => {
    const c = d.courses.find(x => x.id === e.courseId)!
    const row = m.get(c.id) ?? { title: c.title, enrolled: 0, attended: 0, completed: 0, results: [] }
    row.enrolled++; if (e.attended || e.status === 'Completed') row.attended++; if (e.status === 'Completed') row.completed++
    if (e.result !== undefined) row.results.push(e.result)
    m.set(c.id, row)
  })
  return m
}
export function attendanceReport(d: Data, r: Range, f: Filters, compare: boolean) {
  const cur = attFor(d, r, f), prev = attFor(d, previousRange(r), f)
  const keys = Array.from(cur.keys())
  const chart = keys.map(k => { const x = cur.get(k)!; const p = prev.get(k); return { name: short(x.title), 'Attended %': pct(x.attended, x.enrolled), 'Completed %': pct(x.completed, x.enrolled), Previous: compare ? pct(p?.completed ?? 0, p?.enrolled ?? 0) : undefined } })
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : '–')
  const table: Table = { head: ['Course', 'Enrolled', 'Attended', 'Completed', 'Completion %', 'Average result'], rows: keys.map(k => { const x = cur.get(k)!; return [x.title, x.enrolled, x.attended, x.completed, pct(x.completed, x.enrolled), avg(x.results)] }) }
  const tot = Array.from(cur.values()).reduce((a, x) => ({ e: a.e + x.enrolled, c: a.c + x.completed, at: a.at + x.attended }), { e: 0, c: 0, at: 0 })
  return { chart, table, enrolled: tot.e, completion: pct(tot.c, tot.e), attendance: pct(tot.at, tot.e) }
}

/* -- profitability -------------------------------------------------------- */
const clientFactor = (id?: string) => 0.92 + ((id ? id.charCodeAt(1) : 5) % 5) * 0.03
export function profitReport(rows: LedgerRow[], r: Range, f: Filters, by: 'category' | 'client', compare: boolean, orgName: (id?: string) => string) {
  const calc = (rs: LedgerRow[]) => {
    const m = new Map<string, { revenue: number; cost: number }>()
    rs.forEach(x => {
      const k = by === 'category' ? x.category : x.orgId ? orgName(x.orgId) : 'Self-paying learners'
      const row = m.get(k) ?? { revenue: 0, cost: 0 }
      row.revenue += x.exVat; row.cost += x.exVat * (COST_RATIO[x.category] ?? 0.5) * clientFactor(x.orgId); m.set(k, row)
    })
    return m
  }
  const cur = calc(ledgerIn(rows, r, f)), prev = calc(ledgerIn(rows, previousRange(r), f))
  const keys = Array.from(cur.keys()).sort((a, b) => (cur.get(b)!.revenue - cur.get(b)!.cost) - (cur.get(a)!.revenue - cur.get(a)!.cost))
  const chart = keys.map(k => { const x = cur.get(k)!; const p = prev.get(k); return { name: short(k, 16), Revenue: Math.round(x.revenue), Cost: Math.round(x.cost), Profit: Math.round(x.revenue - x.cost), Previous: compare ? Math.round(p ? p.revenue - p.cost : 0) : undefined } })
  const table: Table = { head: [by === 'category' ? 'Category' : 'Client', 'Revenue ex VAT', 'Delivery cost (illustrative)', 'Profit', 'Margin %'], rows: keys.map(k => { const x = cur.get(k)!; return [k, Math.round(x.revenue), Math.round(x.cost), Math.round(x.revenue - x.cost), pct(x.revenue - x.cost, x.revenue)] }) }
  const rev = Array.from(cur.values()).reduce((a, x) => a + x.revenue, 0), cost = Array.from(cur.values()).reduce((a, x) => a + x.cost, 0)
  const prevProfit = Array.from(prev.values()).reduce((a, x) => a + x.revenue - x.cost, 0)
  return { chart, table, revenue: rev, cost, profit: rev - cost, margin: pct(rev - cost, rev), prevProfit }
}

/* -- clients -------------------------------------------------------------- */
export function clientsReport(d: Data, rows: LedgerRow[], r: Range, f: Filters, compare: boolean) {
  const cur = ledgerIn(rows, r, f), prev = ledgerIn(rows, previousRange(r), f)
  const sum = (rs: LedgerRow[], org?: string) => rs.filter(x => x.orgId === org).reduce((a, x) => a + x.exVat, 0)
  const orgs = d.orgs.filter(o => !f.org || o.id === f.org)
  const lines = orgs.map(o => {
    const rev = sum(cur, o.id), p = sum(prev, o.id)
    return {
      name: o.name, rev, p, learners: d.learners.filter(l => l.orgId === o.id).length, enrolments: d.enrolments.filter(e => e.orgId === o.id).length,
      outstanding: d.invoices.filter(i => i.orgId === o.id).reduce((a, i) => a + balanceOf(i), 0),
    }
  }).sort((a, b) => b.rev - a.rev)
  const chart = lines.map(l => ({ name: short(l.name, 18), Revenue: Math.round(l.rev), Previous: compare ? Math.round(l.p) : undefined }))
  const table: Table = {
    head: ['Client', 'Revenue ex VAT', 'Previous period', 'Change %', 'Learners', 'Enrolments', 'Outstanding incl VAT'],
    rows: lines.map(l => [l.name, Math.round(l.rev), Math.round(l.p), l.p ? Math.round(((l.rev - l.p) / l.p) * 100) : '–', l.learners, l.enrolments, Math.round(l.outstanding)]),
  }
  return { chart, table, total: lines.reduce((a, l) => a + l.rev, 0) }
}
