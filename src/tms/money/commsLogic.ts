import type { Data } from '../../shared/types'
import { recipientFor } from './actions'

export const MERGE_FIELDS = ['name', 'course', 'date', 'org', 'invoice', 'amount', 'venue'] as const
export const SAMPLE: Record<string, string> = {
  name: 'Zanele', course: 'Project Management Fundamentals', date: '20 Nov 2026', org: 'Cape Freight', invoice: 'INV-0041', amount: 'R55,200', venue: 'Cape Town Training Centre – Room A',
}
export const fillMerge = (s: string, vars: Record<string, string> = SAMPLE) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m)
export const unknownFields = (s: string) => Array.from(new Set((s.match(/\{\{(\w+)\}\}/g) ?? []).map(m => m.slice(2, -2)).filter(k => !(MERGE_FIELDS as readonly string[]).includes(k))))

export type AudienceKind = 'course' | 'client' | 'overdue'
export interface Recipient { name: string; email: string }
export function audience(d: Data, kind: AudienceKind, param: string): { label: string; list: Recipient[] } {
  const uniq = (l: Recipient[]) => l.filter((r, i) => l.findIndex(x => x.email === r.email) === i)
  if (kind === 'course') {
    const c = d.courses.find(x => x.id === param)
    const ids = new Set(d.enrolments.filter(e => e.courseId === param).map(e => e.learnerId))
    return { label: `All learners in ${c?.title ?? 'course'}`, list: uniq(d.learners.filter(l => ids.has(l.id)).map(l => ({ name: l.name, email: l.email }))) }
  }
  if (kind === 'client') {
    const o = d.orgs.find(x => x.id === param)
    return { label: `${o?.name ?? 'Client'} learners`, list: uniq(d.learners.filter(l => l.orgId === param).map(l => ({ name: l.name, email: l.email }))) }
  }
  return { label: 'Clients with overdue invoices', list: uniq(d.invoices.filter(i => i.status === 'Overdue').map(i => recipientFor(d, i))) }
}

/** Stable pseudo engagement for the sent log so the same message always shows the same status. */
export function engagement(id: string): 'Clicked' | 'Opened' | 'Delivered' | 'Bounced' {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const r = h % 100
  return r < 24 ? 'Clicked' : r < 66 ? 'Opened' : r < 95 ? 'Delivered' : 'Bounced'
}
export function deliveryStats(n: number, seed: number) {
  const open = 0.55 + ((seed * 7) % 30) / 100, click = open * (0.35 + ((seed * 3) % 20) / 100)
  return { sent: n, opened: Math.round(n * open), clicked: Math.round(n * click), bounced: n > 20 ? Math.round(n * 0.02) : 0 }
}
