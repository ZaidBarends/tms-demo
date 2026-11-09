import type { AuditEntry, Data } from '../shared/types'
import { invTotal } from '../shared/calc'

export type PersonKind = 'Client contact' | 'B2B learner' | 'Internal learner' | 'B2C learner' | 'Administrator' | 'Finance' | 'Instructor' | 'Recruiter'
export interface Person { key: string; id: string; source: 'contact' | 'learner' | 'staff' | 'recruiter'; name: string; kind: PersonKind; orgId?: string; org: string; email: string; phone: string; note: string }

export function people(d: Data): Person[] {
  const org = (id?: string) => d.orgs.find(o => o.id === id)?.name ?? '—'
  const out: Person[] = []
  d.contacts.forEach(c => out.push({ key: `c:${c.id}`, id: c.id, source: 'contact', name: c.name, kind: 'Client contact', orgId: c.orgId, org: org(c.orgId), email: c.email, phone: '–', note: c.title }))
  d.learners.forEach(l => out.push({
    key: `l:${l.id}`, id: l.id, source: 'learner', name: l.name, orgId: l.orgId, org: l.type === 'b2b' ? org(l.orgId) : l.type === 'internal' ? 'Internal' : 'Self-paying', email: l.email, phone: l.phone, note: l.city,
    kind: l.type === 'b2b' ? 'B2B learner' : l.type === 'internal' ? 'Internal learner' : 'B2C learner',
  }))
  d.staff.forEach(s => out.push({ key: `s:${s.id}`, id: s.id, source: 'staff', name: s.name, kind: s.role === 'admin' ? 'Administrator' : s.role === 'finance' ? 'Finance' : 'Instructor', org: 'Internal', email: s.email, phone: '–', note: s.title }))
  d.recruiters.forEach(r => out.push({ key: `r:${r.id}`, id: r.id, source: 'recruiter', name: r.name, kind: 'Recruiter', org: r.company, email: r.email, phone: '–', note: r.approved ? 'Approved' : 'Pending approval' }))
  return out
}

export function orgMetrics(d: Data, orgId: string) {
  const inv = d.invoices.filter(i => i.orgId === orgId)
  const open = inv.filter(i => i.status !== 'Paid')
  return {
    contacts: d.contacts.filter(c => c.orgId === orgId).length,
    learners: d.learners.filter(l => l.orgId === orgId).length,
    spend: inv.reduce((a, i) => a + invTotal(i), 0),
    openInvoices: open.length,
    overdue: inv.filter(i => i.status === 'Overdue').length,
    openValue: open.reduce((a, i) => a + invTotal(i), 0),
    enrolments: d.enrolments.filter(e => e.orgId === orgId).length,
  }
}

export interface TrailRow { id: string; at: string; source: 'Activity feed' | 'Talent audit'; actor: string; action: string; target: string; detail: string }
export function activityCategory(text: string) {
  const t = text.toLowerCase()
  if (/invoice|credit note|payment|workbook/.test(t)) return 'Finance'
  if (/quote|opportunity/.test(t)) return 'Sales'
  if (/certificate|booked|assigned|course/.test(t)) return 'Learning'
  if (/campaign|reminder|email/.test(t)) return 'Communications'
  if (/introduction|recruiter/.test(t)) return 'Talent'
  return 'General'
}
export function trail(d: Data): TrailRow[] {
  const a: TrailRow[] = d.activity.map(x => ({ id: x.id, at: x.at, source: 'Activity feed', actor: 'System', action: activityCategory(x.text), target: '', detail: x.text }))
  const b: TrailRow[] = d.audit.map((x: AuditEntry) => ({ id: x.id, at: x.at, source: 'Talent audit', actor: x.actor, action: x.action, target: x.target, detail: x.detail }))
  return [...a, ...b].sort((x, y) => y.at.localeCompare(x.at))
}
