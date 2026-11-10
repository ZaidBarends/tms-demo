import type { Enrolment, Session } from '../../shared/types'
import { perLearnerOf, stockOf } from './registry'

/** Learners booked on each session. */
export const bookedBySession = (enrolments: Pick<Enrolment, 'sessionId'>[]): Record<string, number> => {
  const m: Record<string, number> = {}
  enrolments.forEach(e => { if (e.sessionId) m[e.sessionId] = (m[e.sessionId] ?? 0) + 1 })
  return m
}

/**
 * Units of an equipment item a session needs: what the session says, otherwise one per learner booked for
 * per-learner items (such as laptops, at least 1) or a single unit for the rest. 0 when it does not use the item.
 */
export const unitsFor = (s: Pick<Session, 'equipment' | 'equipmentQty'>, name: string, booked: number) =>
  s.equipment.includes(name) ? Math.max(1, s.equipmentQty?.[name] ?? (perLearnerOf(name) ? booked : 1)) : 0

/**
 * Tracked equipment is overbooked on a day when the sessions using it together need more units than are in stock.
 * Returns sessionId -> reasons for every session involved. Cancelled sessions are ignored.
 */
export function stockClashes(sessions: Session[], enrolments: Pick<Enrolment, 'sessionId'>[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const booked = bookedBySession(enrolments)
  const live = sessions.filter(s => s.status !== 'Cancelled')
  const days = Array.from(new Set(live.map(s => s.start)))
  const names = Array.from(new Set(live.flatMap(s => s.equipment)))
  for (const name of names) {
    const stock = stockOf(name)
    if (stock <= 0) continue
    for (const day of days) {
      const users = live.filter(s => s.start === day && s.equipment.includes(name))
      const need = users.reduce((a, s) => a + unitsFor(s, name, booked[s.id] ?? 0), 0)
      if (users.length > 1 && need > stock) users.forEach(s => (out[s.id] ??= []).push(`Equipment: ${name} (${need} needed, ${stock} in stock)`))
      else if (users.length === 1 && need > stock) users.forEach(s => (out[s.id] ??= []).push(`Equipment: ${name} (${need} needed, only ${stock} in stock)`))
    }
  }
  return out
}

/** The busiest day for an item across upcoming scheduled sessions: how many units are needed and when. */
export function peakDemand(sessions: Session[], enrolments: Pick<Enrolment, 'sessionId'>[], name: string, from: string): { units: number; date?: string } {
  const per: Record<string, number> = {}
  const booked = bookedBySession(enrolments)
  sessions.filter(s => s.status === 'Scheduled' && s.start >= from).forEach(s => { const u = unitsFor(s, name, booked[s.id] ?? 0); if (u) per[s.start] = (per[s.start] ?? 0) + u })
  const best = Object.entries(per).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return best ? { units: best[1], date: best[0] } : { units: 0 }
}

export interface BatchRow { line: number; name: string; quantity: number; perLearner: boolean; errors: string[] }
/** Parses pasted lines of `name, quantity, per learner` (comma, semicolon or tab). Quantity may be left off for a single unit. The third column is yes or no (default yes: one unit per learner booked). Checks names against the register and earlier lines. */
export function parseBatch(text: string, existing: string[]): BatchRow[] {
  const seen = new Set(existing.map(n => n.trim().toLowerCase()))
  const rows: BatchRow[] = []
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line || (i === 0 && /^name\s*[,;\t]\s*(quantity|qty)/i.test(line))) return
    const parts = line.split(/[,;\t]/).map(x => x.trim())
    const name = parts[0] ?? ''
    const qtyText = parts[1] || '1'
    const pl = (parts[2] ?? 'yes').toLowerCase()
    const quantity = Number(qtyText)
    const errors: string[] = []
    if (name.length < 3) errors.push('Name must be at least 3 characters')
    else if (seen.has(name.toLowerCase())) errors.push('Already in the register (use Edit to change its stock)')
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) errors.push('Quantity must be a whole number from 1 to 1000')
    if (!['yes', 'y', 'no', 'n', ''].includes(pl)) errors.push('Per learner must be yes or no')
    if (!errors.length) seen.add(name.toLowerCase())
    rows.push({ line: i + 1, name, quantity: Number.isFinite(quantity) ? quantity : 0, perLearner: !['no', 'n'].includes(pl), errors })
  })
  return rows
}
