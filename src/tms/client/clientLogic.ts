import type { Course, Data, Enrolment, Invoice, Session } from '../../shared/types'
import { addDays, daysBetween } from '../../shared/format'
import { inclVat, invTotal } from '../../shared/calc'
import { ClientData, LegacyCert, RosterPerson, STAFF_PROFILE } from './clientSeed'

// ---------- compliance ----------
export interface CertDef { key: string; label: string; code: string; validityDays: number }
export const CERTS: CertDef[] = [
  { key: 'hse', label: 'H&S Essentials', code: 'HSE-101', validityDays: 730 },
  { key: 'heights', label: 'Working at Heights', code: 'HSE-210', validityDays: 730 },
  { key: 'firstaid', label: 'First Aid', code: 'HSE-220', validityDays: 730 },
  { key: 'popia', label: 'POPIA', code: 'POP-120', validityDays: 730 },
  { key: 'cyber', label: 'Cybersecurity', code: 'CYB-110', validityDays: 365 },
]
export const REQUIRED: Record<string, string[]> = {
  Driver: ['hse', 'firstaid'],
  'Warehouse operator': ['hse', 'heights'],
  Supervisor: ['hse', 'heights', 'firstaid', 'popia'],
  'Customer service': ['hse', 'popia', 'cyber'],
  'Office admin': ['hse', 'popia', 'cyber'],
  Manager: ['hse', 'firstaid', 'popia', 'cyber'],
  Staff: ['hse'],
}
export const EXPIRY_WINDOW = 90

export type CertStatus = 'valid' | 'expiring' | 'missing' | 'planned' | 'na'
export interface Cell { status: CertStatus; expires?: string; expired?: boolean }
export interface Person { id: string; name: string; email: string; dept: string; jobRole: string; onPlatform: boolean; learnerId?: string }
export interface MatrixRow { person: Person; cells: Record<string, Cell> }
export interface ExpiryItem { person: Person; cert: CertDef; expires: string; days: number }

export function clientPeople(data: Data, orgId: string, roster: RosterPerson[]): Person[] {
  const learners = data.learners.filter(l => l.orgId === orgId && l.type === 'b2b')
  const emails = new Set(learners.map(l => l.email.toLowerCase()))
  const names = new Set(learners.map(l => l.name.toLowerCase()))
  const onPlatform: Person[] = learners.map(l => {
    const p = STAFF_PROFILE[l.name] ?? { dept: 'Operations', jobRole: 'Staff' }
    return { id: l.id, name: l.name, email: l.email, dept: p.dept, jobRole: p.jobRole, onPlatform: true, learnerId: l.id }
  })
  const extra: Person[] = roster.filter(r => !emails.has(r.email.toLowerCase()) && !names.has(r.name.toLowerCase())).map(r => ({ ...r, onPlatform: false }))
  return [...onPlatform, ...extra]
}

export function certExpiry(issued: string, expires: string | undefined, def: CertDef) { return expires ?? addDays(issued, def.validityDays) }

export function cellFor(data: Data, person: Person, def: CertDef, legacy: LegacyCert[], now: string): Cell {
  if (!REQUIRED[person.jobRole]?.includes(def.key)) return { status: 'na' }
  const course = data.courses.find(c => c.code === def.code)
  const expiries: string[] = []
  if (person.learnerId && course) {
    data.certificates.filter(c => c.learnerId === person.learnerId && c.courseId === course.id).forEach(c => expiries.push(certExpiry(c.issued, c.expires, def)))
  }
  legacy.filter(l => l.person === person.name && l.cert === def.key).forEach(l => expiries.push(l.expires))
  const best = expiries.sort().pop()
  const open = !!person.learnerId && !!course && data.enrolments.some(e => e.learnerId === person.learnerId && e.courseId === course.id && e.status !== 'Completed')
  if (best) {
    const left = daysBetween(now, best)
    if (left < 0) return open ? { status: 'planned', expires: best, expired: true } : { status: 'missing', expires: best, expired: true }
    if (left <= EXPIRY_WINDOW) return { status: 'expiring', expires: best }
    return { status: 'valid', expires: best }
  }
  return open ? { status: 'planned' } : { status: 'missing' }
}

export function complianceMatrix(data: Data, client: Pick<ClientData, 'roster' | 'legacyCerts'>, orgId: string, now: string) {
  const people = clientPeople(data, orgId, client.roster)
  const rows: MatrixRow[] = people.map(person => ({ person, cells: Object.fromEntries(CERTS.map(c => [c.key, cellFor(data, person, c, client.legacyCerts, now)])) }))
  const cells = rows.flatMap(r => Object.values(r.cells)).filter(c => c.status !== 'na')
  const count = (s: CertStatus) => rows.flatMap(r => Object.values(r.cells)).filter(c => c.status === s).length
  const inDate = cells.filter(c => c.status === 'valid' || c.status === 'expiring').length
  const score = cells.length ? Math.round((inDate / cells.length) * 100) : 100
  const expiries: ExpiryItem[] = rows.flatMap(r => CERTS.flatMap(def => {
    const c = r.cells[def.key]
    return c.expires && c.status === 'expiring' ? [{ person: r.person, cert: def, expires: c.expires, days: daysBetween(now, c.expires) }] : []
  })).sort((a, b) => a.days - b.days)
  return { rows, score, expiries, counts: { valid: count('valid'), expiring: count('expiring'), missing: count('missing'), planned: count('planned'), na: count('na') } }
}

// ---------- bulk add ----------
export interface BulkRow { line: number; name: string; email: string; courseId: string; courseTitle: string; errors: string[] }
export function parseBulk(text: string, courses: Pick<Course, 'id' | 'code' | 'title' | 'status'>[], existingEmails: string[]): BulkRow[] {
  const seen = new Set(existingEmails.map(e => e.toLowerCase()))
  const active = courses.filter(c => c.status === 'Active')
  const rows: BulkRow[] = []
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim()
    if (!line) return
    const parts = line.split(/[,;\t]/).map(p => p.trim())
    if (idx === 0 && parts[0].toLowerCase() === 'name') return
    const [name = '', email = '', courseText = ''] = parts
    const errors: string[] = []
    if (name.length < 3) errors.push('Name is too short')
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('Email is not valid')
    else if (seen.has(email.toLowerCase())) errors.push('Email already used')
    const ct = courseText.toLowerCase()
    let match = ct ? active.filter(c => c.code.toLowerCase() === ct || c.title.toLowerCase() === ct) : []
    if (ct && match.length === 0) match = active.filter(c => c.title.toLowerCase().includes(ct))
    if (!ct) errors.push('Course is missing')
    else if (match.length === 0) errors.push('Course not found')
    else if (match.length > 1) errors.push('Course is ambiguous, use the course code')
    if (!errors.length) seen.add(email.toLowerCase())
    rows.push({ line: idx + 1, name, email, courseId: match.length === 1 ? match[0].id : '', courseTitle: match.length === 1 ? match[0].title : courseText, errors })
  })
  return rows
}

// ---------- bookings ----------
export const BOOKING_STEPS = ['Requested', 'Confirmed', 'In progress', 'Completed'] as const
export type BookingStatus = typeof BOOKING_STEPS[number]
export interface BookingGroup { key: string; courseId: string; session?: Session; enrolments: Enrolment[]; status: BookingStatus }
export function groupBookings(data: Data, orgId: string, now: string): BookingGroup[] {
  const es = data.enrolments.filter(e => e.orgId === orgId && e.payer === 'employer')
  const keys = Array.from(new Set(es.map(e => e.sessionId ?? `online:${e.courseId}`)))
  return keys.map(key => {
    const enrolments = es.filter(e => (e.sessionId ?? `online:${e.courseId}`) === key)
    const session = data.sessions.find(s => s.id === enrolments[0].sessionId)
    const status: BookingStatus = enrolments.every(e => e.status === 'Completed') ? 'Completed'
      : enrolments.some(e => e.status === 'In progress') || (session && session.start <= now) ? 'In progress' : 'Confirmed'
    return { key, courseId: enrolments[0].courseId, session, enrolments, status }
  }).sort((a, b) => (b.session?.start ?? '9999').localeCompare(a.session?.start ?? '9999'))
}

// ---------- invoices ----------
export interface LedgerLine { date: string; ref: string; text: string; debit: number; credit: number; balance: number }
export function ledger(invoices: Invoice[]): LedgerLine[] {
  const raw: Omit<LedgerLine, 'balance'>[] = []
  invoices.forEach(i => {
    raw.push({ date: i.issued, ref: i.number, text: i.description, debit: inclVat(i.amount), credit: 0 })
    if (i.creditNote) raw.push({ date: addDays(i.issued, 7), ref: i.number, text: 'Credit note', debit: 0, credit: i.creditNote })
    if (i.status === 'Paid') raw.push({ date: i.paidOn ?? i.issued, ref: i.number, text: 'Payment received', debit: 0, credit: invTotal(i) })
  })
  raw.sort((a, b) => a.date.localeCompare(b.date) || b.debit - a.debit)
  let bal = 0
  return raw.map(l => { bal += l.debit - l.credit; return { ...l, balance: bal } })
}

export const AGING_BUCKETS = ['Not yet due', '1 to 30 days', '31 to 60 days', '61 to 90 days', 'Over 90 days'] as const
export function aging(invoices: Invoice[], now: string): { bucket: string; amount: number; count: number }[] {
  const out = AGING_BUCKETS.map(bucket => ({ bucket: bucket as string, amount: 0, count: 0 }))
  invoices.filter(i => i.status !== 'Paid').forEach(i => {
    const late = daysBetween(i.due, now)
    const idx = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4
    out[idx].amount += invTotal(i); out[idx].count++
  })
  return out
}
