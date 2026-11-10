import type { Data, Invoice, Stage } from './types'
import { VAT_RATE } from './format'
import { isOnline } from '../tms/resources/registry'
import { stockClashes } from '../tms/resources/stock'

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'enquiry', label: 'Enquiry' }, { id: 'needs', label: 'Needs analysis' }, { id: 'quoted', label: 'Quoted' },
  { id: 'won', label: 'Won' }, { id: 'lost', label: 'Lost' },
]
export const inclVat = (n: number) => n * (1 + VAT_RATE)
export const invTotal = (i: Invoice) => inclVat(i.amount) - (i.creditNote ?? 0)
export const seatsTaken = (d: Data, sessionId: string) => d.enrolments.filter(e => e.sessionId === sessionId).length
export const unpaid = (d: Data) => d.invoices.filter(i => i.status !== 'Paid')
export const clientName = (d: Data, i: Invoice) => i.orgId ? d.orgs.find(o => o.id === i.orgId)?.name ?? '—' : d.learners.find(l => l.id === i.learnerId)?.name ?? '—'
export const sessionLabel = (d: Data, sessionId?: string) => {
  const s = d.sessions.find(x => x.id === sessionId); if (!s) return 'Self-paced online'
  return d.courses.find(c => c.id === s.courseId)?.title ?? ''
}
/** Sessions that share a venue, or an instructor, on the same day. Returns map sessionId -> reasons. */
export function clashes(d: Data): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const live = d.sessions.filter(s => s.status !== 'Cancelled')
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j]
    if (a.start !== b.start) continue
    const why: string[] = []
    if (a.venue === b.venue && !isOnline(a.venue)) why.push(`Venue: ${a.venue}`)
    if (a.instructorId === b.instructorId) why.push(`Instructor: ${d.staff.find(s => s.id === a.instructorId)?.name}`)
    if (why.length) { (out[a.id] ??= []).push(...why); (out[b.id] ??= []).push(...why) }
  }
  // Stock-tracked equipment: a day is overbooked when the sessions using it together need more units than are held.
  for (const [id, why] of Object.entries(stockClashes(d.sessions))) (out[id] ??= []).push(...why)
  return out
}
