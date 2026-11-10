import type { Course, Data, Opportunity, Quote, Stage } from '../../shared/types'
import { addDays, daysBetween, iso, parse, today } from '../../shared/format'
import { isOnline, isOutOfService, stockOf, venueNames } from '../resources/registry'
import { bookedBySession, unitsFor } from '../resources/stock'

/** Classroom pass mark (with attendance). The online knowledge check uses a stricter 70% (lms/content.ts). */
export const CLASS_PASS_MARK = 50

/* ------------------------------ pipeline ------------------------------ */
export const STAGE_PROB: Record<Stage, number> = { enquiry: 10, needs: 30, quoted: 60, won: 100, lost: 0 }
export const probOf = (o: Pick<Opportunity, 'stage'>, override?: number) => override ?? STAGE_PROB[o.stage]
export const weightedValue = (o: Pick<Opportunity, 'stage' | 'value'>, override?: number) => Math.round((o.value * probOf(o, override)) / 100)

export const BANDS = [
  { id: 'small', label: 'Under R100k', test: (v: number) => v < 100000 },
  { id: 'medium', label: 'R100k to R250k', test: (v: number) => v >= 100000 && v < 250000 },
  { id: 'large', label: 'R250k and above', test: (v: number) => v >= 250000 },
]
export const bandOf = (v: number) => BANDS.find(b => b.test(v))!.id
export const daysIn = (since: string, now = today()) => Math.max(0, daysBetween(since, now))
export const ageTone = (days: number): 'ok' | 'warn' | 'bad' => (days > 30 ? 'bad' : days > 14 ? 'warn' : 'ok')

/* -------------------------------- quotes ------------------------------ */
export const netUnit = (list: number, disc: number) => Math.round(list * (1 - (Number(disc) || 0) / 100) * 100) / 100

export function expiry(validUntil: string, status: Quote['status'], now = today()): { days: number; label: string; tone: 'ok' | 'warn' | 'bad' | 'none' } {
  const days = daysBetween(now, validUntil)
  if (status === 'Accepted') return { days, label: 'Accepted', tone: 'none' }
  if (status === 'Expired' || days < 0) return { days, label: days < 0 ? `Expired ${-days} day${days === -1 ? '' : 's'} ago` : 'Expired', tone: 'bad' }
  if (days === 0) return { days, label: 'Expires today', tone: 'bad' }
  return { days, label: `${days} day${days === 1 ? '' : 's'} left`, tone: days <= 7 ? 'warn' : 'ok' }
}

/* ----------------------------- scheduling ------------------------------ */
/** Seed lists. The live lists are the resource register (tms/resources/registry.ts), which administrators can edit. */
export const VENUES = [
  'Cape Town Training Centre – Room A', 'Cape Town Training Centre – Room B', 'Bellville Boardroom', 'Stellenbosch Hub', 'Online (video call)',
]
export const EQUIPMENT_ITEMS = ['Projector', 'Laptop trolley', 'First aid manikins', 'Harness kit']

export interface Candidate { id?: string; start: string; venue: string; instructorId: string; equipment: string[]; equipmentQty?: Record<string, number> }
export interface Conflict { kind: 'venue' | 'instructor' | 'equipment' | 'unavailable' | 'resource'; text: string; withId?: string }

export function conflictsFor(d: Data, c: Candidate, unavailable: Record<string, string[]> = {}): Conflict[] {
  const out: Conflict[] = []
  const name = (id: string) => d.staff.find(s => s.id === id)?.name ?? 'Instructor'
  for (const s of d.sessions) {
    if (s.id === c.id || s.status === 'Cancelled' || s.start !== c.start) continue
    const title = d.courses.find(k => k.id === s.courseId)?.code ?? 'another session'
    if (s.venue === c.venue && !isOnline(c.venue)) out.push({ kind: 'venue', text: `${c.venue} is already used by ${title}`, withId: s.id })
    if (s.instructorId === c.instructorId) out.push({ kind: 'instructor', text: `${name(c.instructorId)} already teaches ${title}`, withId: s.id })
  }
  // Tracked equipment: this session's units plus every other session that day must fit within the stock held.
  for (const eq of c.equipment) {
    const stock = stockOf(eq)
    if (stock <= 0) continue
    const others = d.sessions.filter(s => s.id !== c.id && s.status !== 'Cancelled' && s.start === c.start && s.equipment.includes(eq))
    const booked = bookedBySession(d.enrolments)
    const need = unitsFor(c, eq, c.id ? booked[c.id] ?? 0 : 0) + others.reduce((a, s) => a + unitsFor(s, eq, booked[s.id] ?? 0), 0)
    if (need > stock) out.push({ kind: 'equipment', text: others.length ? `${eq}: ${need} needed on ${c.start} but only ${stock} in stock (also used by ${d.courses.find(k => k.id === others[0].courseId)?.code ?? 'another session'})` : `${eq}: ${need} needed but only ${stock} in stock`, withId: others[0]?.id })
  }
  if (isOutOfService('venue', c.venue)) out.push({ kind: 'resource', text: `${c.venue} is out of service` })
  for (const eq of c.equipment) if (isOutOfService('equipment', eq)) out.push({ kind: 'resource', text: `${eq} is out of service` })
  if ((unavailable[c.instructorId] ?? []).includes(c.start)) out.push({ kind: 'unavailable', text: `${name(c.instructorId)} marked ${c.start} as unavailable` })
  return out
}

const isWeekend = (dateStr: string) => { const w = parse(dateStr).getDay(); return w === 0 || w === 6 }

export interface Suggestions { venues: string[]; instructors: string[]; dates: string[] }
export function suggest(d: Data, c: Candidate, unavailable: Record<string, string[]> = {}, horizon = 21): Suggestions {
  const venues = venueNames(true).filter(v => v !== c.venue && !conflictsFor(d, { ...c, venue: v }, unavailable).some(x => x.kind === 'venue'))
  const instructors = d.staff.filter(s => s.role === 'instructor' && s.id !== c.instructorId
    && !conflictsFor(d, { ...c, instructorId: s.id }, unavailable).some(x => x.kind === 'instructor' || x.kind === 'unavailable')).map(s => s.id)
  const dates: string[] = []
  for (let n = 1; n <= horizon && dates.length < 5; n++) {
    for (const sign of [1, -1]) {
      const day = addDays(c.start, n * sign)
      if (day < today() || isWeekend(day) || dates.length >= 5) continue
      if (conflictsFor(d, { ...c, start: day }, unavailable).length === 0) dates.push(day)
    }
  }
  return { venues, instructors, dates }
}

/* -------------------------------- calendar ----------------------------- */
export function startOfWeek(dateStr: string): string {
  const dt = parse(dateStr); const wd = (dt.getDay() + 6) % 7 // Monday = 0
  dt.setDate(dt.getDate() - wd); return iso(dt)
}
export const weekDays = (anchor: string) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))
export function monthGrid(anchor: string): string[] {
  const first = anchor.slice(0, 8) + '01'
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}
export function shiftMonth(anchor: string, delta: number): string {
  const dt = parse(anchor.slice(0, 8) + '01'); dt.setMonth(dt.getMonth() + delta); return iso(dt)
}
export const monthTitle = (anchor: string) => parse(anchor).toLocaleString('en-ZA', { month: 'long', year: 'numeric' })

/* --------------------------------- TNA --------------------------------- */
export const SKILL_AREAS = ['Health & Safety', 'Leadership', 'Project Management', 'Finance Skills', 'Cybersecurity', 'Compliance', 'Soft Skills']
export interface Dept { id: string; name: string; headcount: number; gaps: Record<string, number> }
export interface Rec { courseId: string; area: string; seats: number; score: number; priority: 'High' | 'Medium' | 'Low'; reason: string; alt: boolean }

export const gapPriority = (avg: number): Rec['priority'] => (avg >= 3 ? 'High' : avg >= 2 ? 'Medium' : 'Low')

export function recommend(courses: Course[], depts: Dept[], exclude: string[] = []): Rec[] {
  const out: Rec[] = []
  for (const area of SKILL_AREAS) {
    const hit = depts.filter(x => (x.gaps[area] ?? 0) >= 1)
    if (!hit.length) continue
    const heads = hit.reduce((a, x) => a + x.headcount, 0)
    const score = hit.reduce((a, x) => a + (x.gaps[area] ?? 0) * x.headcount, 0)
    const avg = score / Math.max(1, heads)
    const seats = depts.filter(x => (x.gaps[area] ?? 0) >= 2).reduce((a, x) => a + x.headcount, 0) || Math.ceil(heads / 2)
    const list = courses.filter(c => c.category === area && c.status === 'Active' && !exclude.includes(c.id)).slice(0, 2)
    list.forEach((c, i) => out.push({
      courseId: c.id, area, seats, score, priority: gapPriority(avg), alt: i > 0,
      reason: `Average gap ${avg.toFixed(1)} of 4 in ${hit.map(x => x.name).join(', ')}`,
    }))
  }
  return out.sort((a, b) => Number(a.alt) - Number(b.alt) || b.score - a.score)
}

export function gapTotals(depts: Dept[]) {
  return SKILL_AREAS.map(area => {
    const heads = depts.reduce((a, x) => a + x.headcount, 0) || 1
    return { area, avg: depts.reduce((a, x) => a + (x.gaps[area] ?? 0) * x.headcount, 0) / heads }
  })
}

/* --------------------------------- misc -------------------------------- */
export function monthlyLoad(d: Data, instructorId: string, anchor: string, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const m = shiftMonth(anchor, i - 2).slice(0, 7)
    const ss = d.sessions.filter(s => s.instructorId === instructorId && s.status !== 'Cancelled' && s.start.startsWith(m))
    const hours = ss.reduce((a, s) => a + (d.courses.find(c => c.id === s.courseId)?.hours ?? 0), 0)
    return { key: m, sessions: ss.length, hours }
  })
}

/** Share of the next `days` working days on which a resource has a session. */
export function occupancy(dates: string[], busy: Set<string>) {
  const work = dates.filter(x => !isWeekend(x))
  if (!work.length) return 0
  return Math.round((work.filter(x => busy.has(x)).length / work.length) * 100)
}
export const workdaysFrom = (start: string, days: number) => Array.from({ length: days }, (_, i) => addDays(start, i)).filter(x => !isWeekend(x))
